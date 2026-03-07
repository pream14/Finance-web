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

    print(f"Report request: start_date={start_date}, end_date={end_date}, area={area}, loan_type={loan_type}, report_type={report_type}")

    if not start_date or not end_date:
        return None, {'error': 'start_date and end_date are required'}

    # Base querysets
    loans_qs = Loan.objects.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)
    transactions_qs = Transaction.objects.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)
    expenses_qs = Expense.objects.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)

    # Additional filters
    collected_by = request.query_params.get('collected_by')
    search = request.query_params.get('search')

    # Apply optional filters
    if area:
        loans_qs = loans_qs.filter(customer__area__iexact=area)
        transactions_qs = transactions_qs.filter(loan__customer__area__iexact=area)
    if loan_type:
        loans_qs = loans_qs.filter(loan_type=loan_type)
        transactions_qs = transactions_qs.filter(loan__loan_type=loan_type)
    if collected_by:
        from django.db.models import Q as QFilter
        transactions_qs = transactions_qs.filter(
            QFilter(created_by__first_name__icontains=collected_by) |
            QFilter(created_by__last_name__icontains=collected_by) |
            QFilter(created_by__username__icontains=collected_by)
        )
    if search:
        transactions_qs = transactions_qs.filter(loan__customer__name__icontains=search)

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

    elif report_type == 'transactions':
        # Collection table data matching frontend exactly
        transactions = transactions_qs.select_related('loan__customer', 'created_by').order_by('-created_at')
        
        for txn in transactions:
            # Interest display logic: show interest only for ML and DL loans
            interest_display = ''
            if txn.loan and (txn.loan.loan_type == 'Monthly Interest Loan' or txn.loan.loan_type == 'DL Loan'):
                interest_display = str(txn.interest_amount or 0)
            else:
                interest_display = '-'
            
            # Get collector name from created_by user
            collector_name = 'Unknown'
            if txn.created_by:
                full_name = txn.created_by.get_full_name()
                collector_name = full_name if full_name else txn.created_by.username
            
            breakdown.append({
                'id': txn.id,
                'date': txn.created_at.strftime('%d/%m/%Y') if txn.created_at else '',
                'customer_name': txn.loan.customer.name if txn.loan and txn.loan.customer else 'Unknown',
                'loan_type': 'ML' if txn.loan.loan_type == 'Monthly Interest Loan' else 'DL' if txn.loan.loan_type == 'DL Loan' else txn.loan.loan_type if txn.loan else 'Unknown',
                'interest': interest_display,
                'amount': str(txn.amount),
                'balance': str(txn.loan.remaining_amount or 0) if txn.loan else '0',
                'method': txn.payment_method or 'cash',
                'collected_by': collector_name,
            })

        # Collector-wise summary
        collector_totals = {}
        for txn in transactions:
            c_name = 'Unknown'
            if txn.created_by:
                full = txn.created_by.get_full_name()
                c_name = full if full else txn.created_by.username
            if c_name not in collector_totals:
                collector_totals[c_name] = {'count': 0, 'total': Decimal('0')}
            collector_totals[c_name]['count'] += 1
            collector_totals[c_name]['total'] += txn.amount or Decimal('0')

        collector_summary = []
        for name, data in sorted(collector_totals.items(), key=lambda x: x[1]['total'], reverse=True):
            collector_summary.append({
                'name': name,
                'count': data['count'],
                'total': str(data['total']),
            })

        # DC deduction revenue from loans created in the period
        dc_loans_in_period = Loan.objects.filter(
            loan_type='DC Loan',
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            dc_deduction_amount__gt=0,
        )
        if area:
            dc_loans_in_period = dc_loans_in_period.filter(customer__area__iexact=area)
        dc_deduction_total = dc_loans_in_period.aggregate(total=Sum('dc_deduction_amount'))['total'] or Decimal('0')

    # Get distinct areas for filter dropdown
    all_areas = list(
        Customer.objects.values_list('area', flat=True).distinct().order_by('area')
    )

    result = {
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
    }

    # Include extra data for transactions report
    if report_type == 'transactions':
        result['collector_summary'] = collector_summary
        result['dc_deduction_revenue'] = str(dc_deduction_total)

        # New loans given in the period
        new_loans_qs = loans_qs.select_related('customer').order_by('-created_at')
        new_loans_list = []
        for loan in new_loans_qs:
            new_loans_list.append({
                'date': loan.created_at.strftime('%d/%m/%Y') if loan.created_at else '',
                'customer_name': loan.customer.name if loan.customer else 'Unknown',
                'loan_type': loan.loan_type,
                'principal': str(loan.principal_amount),
                'dc_deduction': str(loan.dc_deduction_amount or 0) if loan.loan_type == 'DC Loan' else '-',
            })
        result['new_loans'] = new_loans_list

    return result, None


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
            return self._generate_pdf(filename, report_type, summary, breakdown, data['filters'], data)
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
        elif report_type == 'transactions' and breakdown:
            writer.writerow(['=== COLLECTION TABLE ==='])
            writer.writerow(['Date', 'Customer', 'Loan Type', 'Interest', 'Amount', 'Balance', 'Method', 'Collected By'])
            for row in breakdown:
                writer.writerow([
                    row['date'], row['customer_name'], row['loan_type'],
                    row['interest'], row['amount'], row['balance'],
                    row['method'], row['collected_by'],
                ])

        return response

    def _generate_pdf(self, filename, report_type, summary, breakdown, filters, full_data=None):
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
            'transactions': 'Collection Report',
        }
        elements.append(Paragraph(report_titles.get(report_type, 'Financial Report'), title_style))
        elements.append(Paragraph(
            f"Period: {summary['period']['start_date']} to {summary['period']['end_date']}"
            + (f" | Area: {filters.get('area')}" if filters.get('area') else "")
            + (f" | Loan Type: {filters.get('loan_type')}" if filters.get('loan_type') else ""),
            subtitle_style
        ))

        # Styles used in tables
        header_style = ParagraphStyle('Header', parent=styles['Normal'], fontSize=12,
                                       textColor=colors.white, fontName='Helvetica-Bold')
        cell_style = ParagraphStyle('Cell', parent=styles['Normal'], fontSize=10)
        value_style = ParagraphStyle('Value', parent=styles['Normal'], fontSize=10,
                                      fontName='Helvetica-Bold', alignment=TA_RIGHT)

        # Summary table (skip for transactions report — detailed table is more useful)
        if report_type != 'transactions':
            summary_data = [
                [Paragraph('Metric', header_style), Paragraph('Amount', header_style)],
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

            elif report_type == 'transactions' and full_data:
                # For transactions: summaries first, collection table last

                # 1. Collector Summary
                collector_summary = full_data.get('collector_summary', [])
                if collector_summary:
                    elements.append(Paragraph('Collector Summary', section_style))
                    cs_data = [['Collector', 'Collections', 'Total Amount']]
                    for cs in collector_summary:
                        cs_data.append([cs['name'], str(cs['count']), cs['total']])
                    cs_table = Table(cs_data, colWidths=[2.5*inch, 1.5*inch, 2.0*inch])
                    cs_table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#334155')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, 0), 10),
                        ('FONTSIZE', (0, 1), (-1, -1), 10),
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
                        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
                        ('TOPPADDING', (0, 0), (-1, -1), 7),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
                        ('LEFTPADDING', (0, 0), (-1, -1), 8),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                    ]))
                    elements.append(cs_table)
                    elements.append(Spacer(1, 15))

                # 2. Revenue Summary
                dc_revenue = full_data.get('dc_deduction_revenue', '0')
                interest_collected = summary.get('total_interest_collected', '0')
                total_revenue = Decimal(dc_revenue) + Decimal(interest_collected)

                elements.append(Paragraph('Revenue Summary', section_style))
                rev_data = [
                    ['Source', 'Amount'],
                    ['DC Deduction (from new loans)', dc_revenue],
                    ['Interest Collected', interest_collected],
                    ['Total Revenue', str(total_revenue)],
                ]
                rev_table = Table(rev_data, colWidths=[3.5*inch, 2.5*inch])
                rev_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#334155')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('FONTSIZE', (0, 1), (-1, -1), 10),
                    ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e8f5e9')),
                    ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#f8f9fa')]),
                    ('TOPPADDING', (0, 0), (-1, -1), 7),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
                    ('LEFTPADDING', (0, 0), (-1, -1), 8),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                    ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ]))
                elements.append(rev_table)
                elements.append(Spacer(1, 15))

                # 3. New Loans Given
                new_loans = full_data.get('new_loans', [])
                if new_loans:
                    elements.append(Paragraph(f'New Loans Given ({len(new_loans)})', section_style))
                    nl_data = [['Date', 'Customer', 'Loan Type', 'Principal', 'DC Deduction']]
                    total_principal = Decimal('0')
                    for nl in new_loans:
                        nl_data.append([nl['date'], nl['customer_name'], nl['loan_type'], nl['principal'], nl['dc_deduction']])
                        total_principal += Decimal(nl['principal'])
                    nl_data.append(['', 'Total', '', str(total_principal), ''])
                    nl_table = Table(nl_data, colWidths=[0.9*inch, 1.8*inch, 1.2*inch, 1.2*inch, 1.0*inch])
                    nl_table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#334155')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, 0), 9),
                        ('FONTSIZE', (0, 1), (-1, -1), 9),
                        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e8f5e9')),
                        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
                        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#f8f9fa')]),
                        ('TOPPADDING', (0, 0), (-1, -1), 6),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                        ('LEFTPADDING', (0, 0), (-1, -1), 6),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                        ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
                    ]))
                    elements.append(nl_table)
                    elements.append(Spacer(1, 15))

                # 4. Collection Table (last)
                elements.append(Paragraph('Collection Table', section_style))
                bd_header = ['Date', 'Customer', 'Loan Type', 'Interest', 'Amount', 'Balance', 'Method', 'Collected By']
                bd_data = [bd_header]
                for row in breakdown:
                    bd_data.append([
                        row['date'], row['customer_name'], row['loan_type'],
                        row['interest'], row['amount'], row['balance'],
                        row['method'], row['collected_by'],
                    ])
                col_widths = [0.75*inch, 1.1*inch, 0.95*inch, 0.7*inch, 0.75*inch, 0.75*inch, 0.7*inch, 0.95*inch]

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

                # Totals row
                total_amount = sum(Decimal(row['amount']) for row in breakdown)
                total_interest = sum(
                    Decimal(row['interest']) for row in breakdown
                    if row['interest'] != '-'
                )
                totals_data = [
                    ['', '', '', f'Interest: {total_interest}', f'Total: {total_amount}', '', '', ''],
                ]
                totals_table = Table(totals_data, colWidths=col_widths)
                totals_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e8f5e9')),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 9),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                    ('LEFTPADDING', (0, 0), (-1, -1), 6),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                    ('ALIGN', (3, 0), (4, 0), 'RIGHT'),
                ]))
                elements.append(totals_table)

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


class CustomerReportDownloadView(APIView):
    """Generate PDF report for a specific customer's loan collection entries."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, customer_id):
        try:
            customer = Customer.objects.get(id=customer_id)
        except Customer.DoesNotExist:
            return Response({'error': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)

        loan_id = request.query_params.get('loan_id')

        # Get loans for this customer
        loans_qs = Loan.objects.filter(customer=customer)
        if loan_id:
            loans_qs = loans_qs.filter(id=loan_id)

        loans = list(loans_qs.order_by('-created_at'))

        if not loans:
            return Response({'error': 'No loans found for this customer'}, status=status.HTTP_404_NOT_FOUND)

        # Get transactions
        transactions_qs = Transaction.objects.filter(loan__customer=customer)
        if loan_id:
            transactions_qs = transactions_qs.filter(loan_id=loan_id)
        transactions = list(transactions_qs.order_by('-created_at'))

        # Generate PDF
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import inch, mm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_RIGHT

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=15*mm, bottomMargin=15*mm,
                                leftMargin=12*mm, rightMargin=12*mm)
        styles = getSampleStyleSheet()
        elements = []

        # Styles
        title_style = ParagraphStyle('Title', parent=styles['Title'], fontSize=16,
                                     textColor=colors.HexColor('#1a1a2e'), spaceAfter=4)
        subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=10,
                                        textColor=colors.HexColor('#666666'), alignment=TA_CENTER, spaceAfter=15)
        section_style = ParagraphStyle('Section', parent=styles['Heading2'], fontSize=13,
                                        textColor=colors.HexColor('#1a1a2e'), spaceBefore=10, spaceAfter=8)
        cell_style = ParagraphStyle('Cell', parent=styles['Normal'], fontSize=9)
        header_style_white = ParagraphStyle('HeaderWhite', parent=styles['Normal'], fontSize=9,
                                             textColor=colors.white, fontName='Helvetica-Bold')
        value_style = ParagraphStyle('Value', parent=styles['Normal'], fontSize=9,
                                      fontName='Helvetica-Bold', alignment=TA_RIGHT)

        # Title
        elements.append(Paragraph(f'Customer Report — {customer.name}', title_style))
        elements.append(Paragraph(
            f'Phone: {customer.phone_number} | Area: {customer.area} | Address: {customer.address}',
            subtitle_style
        ))

        # Loan summary section
        elements.append(Paragraph('Loan Summary', section_style))

        loan_header = ['Loan Type', 'Principal', 'Remaining', 'Status', 'Start Date']
        loan_data = [loan_header]
        for loan in loans:
            loan_data.append([
                loan.loan_type,
                f'{loan.principal_amount:,.0f}',
                f'{loan.remaining_amount:,.0f}',
                loan.status.title(),
                loan.created_at.strftime('%d %b %Y') if loan.created_at else '-',
            ])

        loan_table = Table(loan_data, colWidths=[1.5*inch, 1.2*inch, 1.2*inch, 0.9*inch, 1.1*inch])
        loan_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
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
            ('ALIGN', (1, 0), (2, -1), 'RIGHT'),
        ]))
        elements.append(loan_table)
        elements.append(Spacer(1, 15))

        # Collection entries section
        if transactions:
            elements.append(Paragraph('Collection Entries', section_style))

            txn_header = ['Date', 'Loan Type', 'Amount', 'Asal', 'Interest', 'Method', 'Description']
            txn_data = [txn_header]
            total_amount = Decimal('0')
            total_asal = Decimal('0')
            total_interest = Decimal('0')

            for txn in transactions:
                txn_data.append([
                    txn.created_at.strftime('%d %b %Y') if txn.created_at else '-',
                    txn.loan.loan_type if txn.loan else '-',
                    f'{txn.amount:,.0f}',
                    f'{txn.asal_amount:,.0f}' if txn.asal_amount else '0',
                    f'{txn.interest_amount:,.0f}' if txn.interest_amount else '0',
                    txn.payment_method.title() if txn.payment_method else '-',
                    (txn.description or '-')[:30],
                ])
                total_amount += txn.amount or Decimal('0')
                total_asal += txn.asal_amount or Decimal('0')
                total_interest += txn.interest_amount or Decimal('0')

            # Add total row
            txn_data.append([
                'TOTAL', '', f'{total_amount:,.0f}', f'{total_asal:,.0f}',
                f'{total_interest:,.0f}', '', ''
            ])

            col_widths = [0.8*inch, 1.0*inch, 0.9*inch, 0.9*inch, 0.9*inch, 0.8*inch, 1.2*inch]
            txn_table = Table(txn_data, colWidths=col_widths)
            txn_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#334155')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 7),
                ('FONTSIZE', (0, 1), (-1, -1), 7),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#f8f9fa')]),
                ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e8f5e9')),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('ALIGN', (2, 0), (4, -1), 'RIGHT'),
            ]))
            elements.append(txn_table)
        else:
            elements.append(Paragraph('No collection entries found.', cell_style))

        # Footer
        elements.append(Spacer(1, 25))
        footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8,
                                       textColor=colors.HexColor('#999999'), alignment=TA_CENTER)
        elements.append(Paragraph(
            f"Generated on {date.today().strftime('%d %b %Y')} | {len(transactions)} entries | {len(loans)} loan(s)",
            footer_style
        ))

        doc.build(elements)
        buffer.seek(0)

        # Use customer name in filename (sanitize for filesystem)
        safe_name = customer.name.replace(' ', '_').replace('/', '-')
        if loan_id:
            loan_obj = loans[0]
            loan_label = loan_obj.loan_type.replace(' ', '_')
            filename = f"{safe_name}_{loan_label}_report"
        else:
            filename = f"{safe_name}_all_loans_report"

        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}.pdf"'
        return response
