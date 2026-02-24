import csv
import io
from datetime import date
from decimal import Decimal

from django.db.models import Sum, Count, Q, F
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from .models import Loan, Transaction
from customers.models import Customer
from expenses.models import Expense


def _get_report_data(request):
    """Shared logic for computing report data from query params."""
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    area = request.query_params.get('area')
    loan_type = request.query_params.get('loan_type')
    report_type = request.query_params.get('report_type', 'summary')

    if not start_date or not end_date:
        return None, {'error': 'start_date and end_date are required'}

    # Base querysets
    loans_qs = Loan.objects.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)
    transactions_qs = Transaction.objects.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)
    expenses_qs = Expense.objects.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)

    # Apply optional filters
    if area:
        loans_qs = loans_qs.filter(customer__area__iexact=area)
        transactions_qs = transactions_qs.filter(loan__customer__area__iexact=area)
    if loan_type:
        loans_qs = loans_qs.filter(loan_type=loan_type)
        transactions_qs = transactions_qs.filter(loan__loan_type=loan_type)

    # Aggregate totals
    total_disbursed = loans_qs.aggregate(total=Sum('principal_amount'))['total'] or Decimal('0')
    total_loans_count = loans_qs.count()

    txn_agg = transactions_qs.aggregate(
        total_collected=Sum('amount'),
        total_principal_collected=Sum('asal_amount'),
        total_interest_collected=Sum('interest_amount'),
        total_transactions=Count('id'),
    )
    total_collected = txn_agg['total_collected'] or Decimal('0')
    total_principal_collected = txn_agg['total_principal_collected'] or Decimal('0')
    total_interest_collected = txn_agg['total_interest_collected'] or Decimal('0')
    total_transactions = txn_agg['total_transactions'] or 0

    total_expenses = expenses_qs.aggregate(total=Sum('amount'))['total'] or Decimal('0')
    net_income = total_interest_collected - total_expenses

    summary = {
        'period': {'start_date': start_date, 'end_date': end_date},
        'total_disbursed': str(total_disbursed),
        'total_loans_count': total_loans_count,
        'total_collected': str(total_collected),
        'total_principal_collected': str(total_principal_collected),
        'total_interest_collected': str(total_interest_collected),
        'total_transactions': total_transactions,
        'total_expenses': str(total_expenses),
        'net_income': str(net_income),
    }

    # Build breakdown based on report type
    breakdown = []

    if report_type == 'area_wise':
        area_data = (
            transactions_qs
            .values(area_name=F('loan__customer__area'))
            .annotate(
                total_collected=Sum('amount'),
                principal_collected=Sum('asal_amount'),
                interest_collected=Sum('interest_amount'),
                transaction_count=Count('id'),
            )
            .order_by('-total_collected')
        )
        # Count customers and loans per area
        for row in area_data:
            a = row['area_name'] or 'Unknown'
            cust_count = Customer.objects.filter(area__iexact=a, loans__transactions__created_at__date__gte=start_date, loans__transactions__created_at__date__lte=end_date).distinct().count()
            loan_count = Loan.objects.filter(customer__area__iexact=a, transactions__created_at__date__gte=start_date, transactions__created_at__date__lte=end_date).distinct().count()
            breakdown.append({
                'area': a,
                'customers': cust_count,
                'loans': loan_count,
                'total_collected': str(row['total_collected'] or 0),
                'principal_collected': str(row['principal_collected'] or 0),
                'interest_collected': str(row['interest_collected'] or 0),
                'transactions': row['transaction_count'],
            })

    elif report_type == 'loan_wise':
        loan_data = (
            transactions_qs
            .values(type=F('loan__loan_type'))
            .annotate(
                total_collected=Sum('amount'),
                principal_collected=Sum('asal_amount'),
                interest_collected=Sum('interest_amount'),
                transaction_count=Count('id'),
            )
            .order_by('-total_collected')
        )
        for row in loan_data:
            lt = row['type'] or 'Unknown'
            loan_count = Loan.objects.filter(loan_type=lt, transactions__created_at__date__gte=start_date, transactions__created_at__date__lte=end_date).distinct().count()
            breakdown.append({
                'loan_type': lt,
                'loans': loan_count,
                'total_collected': str(row['total_collected'] or 0),
                'principal_collected': str(row['principal_collected'] or 0),
                'interest_collected': str(row['interest_collected'] or 0),
                'transactions': row['transaction_count'],
            })

    # Get distinct areas for filter dropdown
    all_areas = list(
        Customer.objects.values_list('area', flat=True).distinct().order_by('area')
    )

    return {
        'report_type': report_type,
        'filters': {
            'start_date': start_date,
            'end_date': end_date,
            'area': area,
            'loan_type': loan_type,
        },
        'summary': summary,
        'breakdown': breakdown,
        'available_areas': all_areas,
    }, None


class ReportDataView(APIView):
    """JSON report data endpoint with filtering."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data, error = _get_report_data(request)
        if error:
            return Response(error, status=status.HTTP_400_BAD_REQUEST)
        return Response(data)


class ReportDownloadView(APIView):
    """Download report as CSV or PDF."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data, error = _get_report_data(request)
        if error:
            return Response(error, status=status.HTTP_400_BAD_REQUEST)

        fmt = request.query_params.get('file_format', 'csv').lower()
        report_type = data['report_type']
        summary = data['summary']
        breakdown = data['breakdown']
        start = data['filters']['start_date']
        end = data['filters']['end_date']
        filename = f"report_{report_type}_{start}_to_{end}"

        if fmt == 'pdf':
            return self._generate_pdf(filename, report_type, summary, breakdown, data['filters'])
        else:
            return self._generate_csv(filename, report_type, summary, breakdown)

    def _generate_csv(self, filename, report_type, summary, breakdown):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}.csv"'
        writer = csv.writer(response)

        # Summary section
        writer.writerow(['=== REPORT SUMMARY ==='])
        writer.writerow(['Period', f"{summary['period']['start_date']} to {summary['period']['end_date']}"])
        writer.writerow(['Total Disbursed', summary['total_disbursed']])
        writer.writerow(['Total Loans', summary['total_loans_count']])
        writer.writerow(['Total Collected', summary['total_collected']])
        writer.writerow(['Principal Collected', summary['total_principal_collected']])
        writer.writerow(['Interest Collected (Income)', summary['total_interest_collected']])
        writer.writerow(['Total Expenses', summary['total_expenses']])
        writer.writerow(['Net Income', summary['net_income']])
        writer.writerow([])

        # Breakdown section
        if report_type == 'area_wise' and breakdown:
            writer.writerow(['=== AREA-WISE BREAKDOWN ==='])
            writer.writerow(['Area', 'Customers', 'Loans', 'Total Collected', 'Principal', 'Interest', 'Transactions'])
            for row in breakdown:
                writer.writerow([
                    row['area'], row['customers'], row['loans'],
                    row['total_collected'], row['principal_collected'],
                    row['interest_collected'], row['transactions'],
                ])
        elif report_type == 'loan_wise' and breakdown:
            writer.writerow(['=== LOAN TYPE BREAKDOWN ==='])
            writer.writerow(['Loan Type', 'Loans', 'Total Collected', 'Principal', 'Interest', 'Transactions'])
            for row in breakdown:
                writer.writerow([
                    row['loan_type'], row['loans'],
                    row['total_collected'], row['principal_collected'],
                    row['interest_collected'], row['transactions'],
                ])

        return response

    def _generate_pdf(self, filename, report_type, summary, breakdown, filters):
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import inch, mm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_RIGHT

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm,
                                leftMargin=15*mm, rightMargin=15*mm)
        styles = getSampleStyleSheet()
        elements = []

        # Title
        title_style = ParagraphStyle('Title', parent=styles['Title'], fontSize=18,
                                     textColor=colors.HexColor('#1a1a2e'), spaceAfter=6)
        subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=10,
                                        textColor=colors.HexColor('#666666'), alignment=TA_CENTER, spaceAfter=20)

        report_titles = {
            'summary': 'Income Tax Summary Report',
            'area_wise': 'Area-Wise Detail Report',
            'loan_wise': 'Loan Type Report',
        }
        elements.append(Paragraph(report_titles.get(report_type, 'Financial Report'), title_style))
        elements.append(Paragraph(
            f"Period: {summary['period']['start_date']} to {summary['period']['end_date']}"
            + (f" | Area: {filters.get('area')}" if filters.get('area') else "")
            + (f" | Loan Type: {filters.get('loan_type')}" if filters.get('loan_type') else ""),
            subtitle_style
        ))

        # Summary table
        header_style = ParagraphStyle('Header', parent=styles['Normal'], fontSize=12,
                                       textColor=colors.white, fontName='Helvetica-Bold')
        cell_style = ParagraphStyle('Cell', parent=styles['Normal'], fontSize=10)
        value_style = ParagraphStyle('Value', parent=styles['Normal'], fontSize=10,
                                      fontName='Helvetica-Bold', alignment=TA_RIGHT)

        summary_data = [
            [Paragraph('Metric', header_style), Paragraph('Amount (₹)', header_style)],
            [Paragraph('Total Disbursed', cell_style), Paragraph(summary['total_disbursed'], value_style)],
            [Paragraph('Total Loans Issued', cell_style), Paragraph(str(summary['total_loans_count']), value_style)],
            [Paragraph('Total Collected', cell_style), Paragraph(summary['total_collected'], value_style)],
            [Paragraph('Principal Collected', cell_style), Paragraph(summary['total_principal_collected'], value_style)],
            [Paragraph('Interest Earned (Income)', cell_style), Paragraph(summary['total_interest_collected'], value_style)],
            [Paragraph('Total Expenses', cell_style), Paragraph(summary['total_expenses'], value_style)],
            [Paragraph('Net Income', cell_style), Paragraph(summary['net_income'], value_style)],
        ]

        summary_table = Table(summary_data, colWidths=[3.5*inch, 2.5*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e8f5e9')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#f8f9fa')]),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 20))

        # Breakdown table
        if breakdown:
            section_style = ParagraphStyle('Section', parent=styles['Heading2'], fontSize=14,
                                            textColor=colors.HexColor('#1a1a2e'), spaceBefore=10, spaceAfter=10)

            if report_type == 'area_wise':
                elements.append(Paragraph('Area-Wise Breakdown', section_style))
                bd_header = ['Area', 'Customers', 'Loans', 'Collected', 'Principal', 'Interest', 'Txns']
                bd_data = [bd_header]
                for row in breakdown:
                    bd_data.append([
                        row['area'], str(row['customers']), str(row['loans']),
                        row['total_collected'], row['principal_collected'],
                        row['interest_collected'], str(row['transactions']),
                    ])
                col_widths = [1.3*inch, 0.8*inch, 0.7*inch, 1.1*inch, 1.0*inch, 1.0*inch, 0.6*inch]

            elif report_type == 'loan_wise':
                elements.append(Paragraph('Loan Type Breakdown', section_style))
                bd_header = ['Loan Type', 'Loans', 'Collected', 'Principal', 'Interest', 'Txns']
                bd_data = [bd_header]
                for row in breakdown:
                    bd_data.append([
                        row['loan_type'], str(row['loans']),
                        row['total_collected'], row['principal_collected'],
                        row['interest_collected'], str(row['transactions']),
                    ])
                col_widths = [1.5*inch, 0.8*inch, 1.2*inch, 1.1*inch, 1.1*inch, 0.8*inch]
            else:
                bd_data = []
                col_widths = []

            if bd_data:
                bd_table = Table(bd_data, colWidths=col_widths)
                bd_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#334155')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 9),
                    ('FONTSIZE', (0, 1), (-1, -1), 9),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                    ('LEFTPADDING', (0, 0), (-1, -1), 6),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                    ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ]))
                elements.append(bd_table)

        # Footer
        elements.append(Spacer(1, 30))
        footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8,
                                       textColor=colors.HexColor('#999999'), alignment=TA_CENTER)
        elements.append(Paragraph(f"Generated on {date.today().strftime('%d %b %Y')} ", footer_style))

        doc.build(elements)
        buffer.seek(0)

        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}.pdf"'
        return response
