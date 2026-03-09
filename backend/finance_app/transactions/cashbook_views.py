import io
from datetime import date, timedelta
from decimal import Decimal
from django.db.models import Sum, Q
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from .models import Loan, Transaction, DailyCashBook
from expenses.models import Expense


class DailyCashBookView(APIView):
    """
    Daily Cash Book (Iruppu) API
    GET: Calculate cash book for a given date
    POST: Save/update opening balance for a date
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        date_str = request.query_params.get('date')
        if date_str:
            try:
                target_date = date.fromisoformat(date_str)
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            target_date = date.today()

        # Get or calculate opening balance (iruppu)
        # First check if there's a saved record for this date
        cashbook_entry, _ = DailyCashBook.objects.get_or_create(
            date=target_date,
            defaults={'opening_balance': Decimal('0'), 'closing_balance': Decimal('0')}
        )

        # If opening balance is 0 and no manual override, try to get previous day's closing balance
        if cashbook_entry.opening_balance == 0:
            previous_entry = DailyCashBook.objects.filter(
                date__lt=target_date
            ).order_by('-date').first()
            if previous_entry:
                cashbook_entry.opening_balance = previous_entry.closing_balance
                cashbook_entry.save()

        opening_balance = cashbook_entry.opening_balance

        # Today's cash collections (customer repayments via cash)
        cash_collections = Transaction.objects.filter(
            created_at__date=target_date,
            payment_method='cash'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        # Today's online collections
        online_collections = Transaction.objects.filter(
            created_at__date=target_date,
            payment_method='online'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        # New cash loans given today (money going out)
        cash_loans_given = Loan.objects.filter(
            created_at__date=target_date,
            payment_method='cash'
        ).aggregate(total=Sum('principal_amount'))['total'] or Decimal('0')

        # New online loans given today
        online_loans_given = Loan.objects.filter(
            created_at__date=target_date,
            payment_method='online'
        ).aggregate(total=Sum('principal_amount'))['total'] or Decimal('0')

        # Today's expenses split by payment method
        cash_expenses = Expense.objects.filter(
            created_at__date=target_date,
            payment_method='cash'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        online_expenses = Expense.objects.filter(
            created_at__date=target_date,
            payment_method='online'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        expenses_total = cash_expenses + online_expenses

        # DC deduction revenue (advance interest from new DC loans today)
        dc_deduction_revenue = Loan.objects.filter(
            created_at__date=target_date,
            loan_type='DC Loan',
            dc_deduction_amount__gt=0
        ).aggregate(total=Sum('dc_deduction_amount'))['total'] or Decimal('0')

        # Interest revenue collected today broken down by loan type
        monthly_interest = Transaction.objects.filter(
            created_at__date=target_date,
            loan__loan_type='Monthly Interest Loan',
            interest_amount__gt=0
        ).aggregate(total=Sum('interest_amount'))['total'] or Decimal('0')

        dl_interest = Transaction.objects.filter(
            created_at__date=target_date,
            loan__loan_type='DL Loan',
            interest_amount__gt=0
        ).aggregate(total=Sum('interest_amount'))['total'] or Decimal('0')

        dc_interest = Transaction.objects.filter(
            created_at__date=target_date,
            loan__loan_type='DC Loan',
            interest_amount__gt=0
        ).aggregate(total=Sum('interest_amount'))['total'] or Decimal('0')

        total_interest_collected = monthly_interest + dl_interest + dc_interest

        # Calculate closing balance
        # Closing = Opening + Cash Collections - Cash Loans Given - Cash Expenses only
        closing_balance = opening_balance + cash_collections - cash_loans_given - cash_expenses

        # Save closing balance
        cashbook_entry.closing_balance = closing_balance
        cashbook_entry.save()

        # Total revenue = DC deductions + all interest collected
        total_revenue = dc_deduction_revenue + total_interest_collected

        # Get expense details
        expense_list = list(Expense.objects.filter(
            created_at__date=target_date
        ).values('id', 'description', 'amount', 'payment_method'))

        # Get new loans given today
        new_loans_list = list(Loan.objects.filter(
            created_at__date=target_date
        ).select_related('customer').values(
            'id', 'customer__name', 'loan_type', 'principal_amount',
            'payment_method', 'dc_deduction_amount'
        ))

        return Response({
            'date': target_date.isoformat(),
            'opening_balance': str(opening_balance),
            'cash_collections': str(cash_collections),
            'online_collections': str(online_collections),
            'total_collections': str(cash_collections + online_collections),
            'cash_loans_given': str(cash_loans_given),
            'online_loans_given': str(online_loans_given),
            'total_loans_given': str(cash_loans_given + online_loans_given),
            'expenses': str(expenses_total),
            'cash_expenses': str(cash_expenses),
            'online_expenses': str(online_expenses),
            'closing_balance': str(closing_balance),
            'revenue': {
                'dc_deduction': str(dc_deduction_revenue),
                'monthly_interest': str(monthly_interest),
                'dl_interest': str(dl_interest),
                'dc_interest': str(dc_interest),
                'total_interest_collected': str(total_interest_collected),
                'total': str(total_revenue),
            },
            'details': {
                'expenses': expense_list,
                'new_loans': new_loans_list,
            },
            'notes': cashbook_entry.notes or '',
        })

    def post(self, request):
        """Save or update opening balance for a date"""
        date_str = request.data.get('date')
        opening_balance = request.data.get('opening_balance')

        if not date_str:
            return Response({'error': 'Date is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_date = date.fromisoformat(date_str)
        except ValueError:
            return Response({'error': 'Invalid date format'}, status=status.HTTP_400_BAD_REQUEST)

        if opening_balance is None:
            return Response({'error': 'opening_balance is required'}, status=status.HTTP_400_BAD_REQUEST)

        cashbook_entry, created = DailyCashBook.objects.get_or_create(
            date=target_date,
            defaults={
                'opening_balance': Decimal(str(opening_balance)),
                'closing_balance': Decimal('0'),
                'created_by': request.user,
            }
        )

        if not created:
            cashbook_entry.opening_balance = Decimal(str(opening_balance))
            cashbook_entry.save()

        # Update notes if provided
        notes = request.data.get('notes')
        if notes is not None:
            cashbook_entry.notes = notes
            cashbook_entry.save()

        return Response({
            'message': 'Opening balance saved',
            'date': target_date.isoformat(),
            'opening_balance': str(cashbook_entry.opening_balance),
        })


class RevenueReportView(APIView):
    """
    Revenue report with date range filtering (weekly, monthly, custom)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Get date range
        range_type = request.query_params.get('range', 'today')
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        today = date.today()

        if start_date_str and end_date_str:
            try:
                start_date = date.fromisoformat(start_date_str)
                end_date = date.fromisoformat(end_date_str)
            except ValueError:
                return Response({'error': 'Invalid date format'}, status=status.HTTP_400_BAD_REQUEST)
        elif range_type == 'today':
            start_date = today
            end_date = today
        elif range_type == 'week':
            start_date = today - timedelta(days=today.weekday())  # Monday
            end_date = today
        elif range_type == 'month':
            start_date = today.replace(day=1)
            end_date = today
        elif range_type == 'last_month':
            first_of_this_month = today.replace(day=1)
            last_month_end = first_of_this_month - timedelta(days=1)
            start_date = last_month_end.replace(day=1)
            end_date = last_month_end
        else:
            start_date = today
            end_date = today

        # DC deduction revenue
        dc_deduction_revenue = Loan.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            loan_type='DC Loan',
            dc_deduction_amount__gt=0
        ).aggregate(total=Sum('dc_deduction_amount'))['total'] or Decimal('0')

        # Interest collected (from transactions)
        interest_collected = Transaction.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            interest_amount__gt=0
        ).aggregate(total=Sum('interest_amount'))['total'] or Decimal('0')

        # Break down interest by loan type
        dc_interest = Transaction.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            loan__loan_type='DC Loan',
            interest_amount__gt=0
        ).aggregate(total=Sum('interest_amount'))['total'] or Decimal('0')

        monthly_interest = Transaction.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            loan__loan_type='Monthly Interest Loan',
            interest_amount__gt=0
        ).aggregate(total=Sum('interest_amount'))['total'] or Decimal('0')

        dl_interest = Transaction.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            loan__loan_type='DL Loan',
            interest_amount__gt=0
        ).aggregate(total=Sum('interest_amount'))['total'] or Decimal('0')

        # Total collections
        total_collections = Transaction.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        # Total loans given
        total_loans_given = Loan.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        ).aggregate(total=Sum('principal_amount'))['total'] or Decimal('0')

        # Total expenses
        total_expenses = Expense.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        total_revenue = dc_deduction_revenue + interest_collected

        return Response({
            'range': range_type,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'revenue': {
                'dc_deduction': str(dc_deduction_revenue),
                'dc_interest': str(dc_interest),
                'monthly_interest': str(monthly_interest),
                'dl_interest': str(dl_interest),
                'total_interest_collected': str(interest_collected),
                'total': str(total_revenue),
            },
            'summary': {
                'total_collections': str(total_collections),
                'total_loans_given': str(total_loans_given),
                'total_expenses': str(total_expenses),
            }
        })


class CashBookPDFDownloadView(APIView):
    """Download daily cash book as PDF."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        date_str = request.query_params.get('date')
        if date_str:
            try:
                target_date = date.fromisoformat(date_str)
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            target_date = date.today()

        # ---- Fetch the same data as DailyCashBookView ----
        from .models import DailyCashBook
        cashbook_entry, _ = DailyCashBook.objects.get_or_create(
            date=target_date,
            defaults={'opening_balance': Decimal('0'), 'closing_balance': Decimal('0')}
        )
        if cashbook_entry.opening_balance == 0:
            previous_entry = DailyCashBook.objects.filter(date__lt=target_date).order_by('-date').first()
            if previous_entry:
                cashbook_entry.opening_balance = previous_entry.closing_balance
                cashbook_entry.save()

        opening_balance = cashbook_entry.opening_balance

        cash_collections = Transaction.objects.filter(
            created_at__date=target_date, payment_method='cash'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        online_collections = Transaction.objects.filter(
            created_at__date=target_date, payment_method='online'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        cash_loans_given = Loan.objects.filter(
            created_at__date=target_date, payment_method='cash'
        ).aggregate(total=Sum('principal_amount'))['total'] or Decimal('0')

        online_loans_given = Loan.objects.filter(
            created_at__date=target_date, payment_method='online'
        ).aggregate(total=Sum('principal_amount'))['total'] or Decimal('0')

        cash_expenses = Expense.objects.filter(
            created_at__date=target_date, payment_method='cash'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        online_expenses = Expense.objects.filter(
            created_at__date=target_date, payment_method='online'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        expenses_total = cash_expenses + online_expenses

        closing_balance = opening_balance + cash_collections - cash_loans_given - cash_expenses

        # Revenue
        dc_deduction = Loan.objects.filter(
            created_at__date=target_date, loan_type='DC Loan', dc_deduction_amount__gt=0
        ).aggregate(total=Sum('dc_deduction_amount'))['total'] or Decimal('0')

        monthly_interest = Transaction.objects.filter(
            created_at__date=target_date, loan__loan_type='Monthly Interest Loan', interest_amount__gt=0
        ).aggregate(total=Sum('interest_amount'))['total'] or Decimal('0')

        dl_interest = Transaction.objects.filter(
            created_at__date=target_date, loan__loan_type='DL Loan', interest_amount__gt=0
        ).aggregate(total=Sum('interest_amount'))['total'] or Decimal('0')

        dc_interest = Transaction.objects.filter(
            created_at__date=target_date, loan__loan_type='DC Loan', interest_amount__gt=0
        ).aggregate(total=Sum('interest_amount'))['total'] or Decimal('0')

        total_revenue = dc_deduction + monthly_interest + dl_interest + dc_interest

        # Details
        expense_list = list(Expense.objects.filter(
            created_at__date=target_date
        ).values('id', 'description', 'amount', 'payment_method'))

        new_loans = list(Loan.objects.filter(
            created_at__date=target_date
        ).select_related('customer').values(
            'id', 'customer__name', 'loan_type', 'principal_amount',
            'payment_method', 'dc_deduction_amount'
        ))

        # ---- Generate PDF ----
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

        # Styles
        title_style = ParagraphStyle('Title', parent=styles['Title'], fontSize=18,
                                     textColor=colors.HexColor('#1a1a2e'), spaceAfter=4)
        subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=10,
                                        textColor=colors.HexColor('#666666'), alignment=TA_CENTER, spaceAfter=20)
        section_style = ParagraphStyle('Section', parent=styles['Heading2'], fontSize=14,
                                        textColor=colors.HexColor('#1a1a2e'), spaceBefore=10, spaceAfter=10)
        cell_style = ParagraphStyle('Cell', parent=styles['Normal'], fontSize=10)
        value_style = ParagraphStyle('Value', parent=styles['Normal'], fontSize=10,
                                      fontName='Helvetica-Bold', alignment=TA_RIGHT)

        def fmt(val):
            """Format decimal to Indian comma style."""
            return f'{val:,.0f}'

        # Title
        formatted_date = target_date.strftime('%d %b %Y, %A')
        elements.append(Paragraph('Daily Cash Book', title_style))
        elements.append(Paragraph(f'{formatted_date}', subtitle_style))

        # ---- Cash Flow Table ----
        elements.append(Paragraph('Cash Flow', section_style))
        flow_data = [
            ['Item', 'Amount'],
            ['Opening Balance', fmt(opening_balance)],
            ['+ Cash Collections', f'+{fmt(cash_collections)}'],
            ['\u2212 Cash Loans Given', f'-{fmt(cash_loans_given)}'],
            ['\u2212 Cash Expenses', f'-{fmt(cash_expenses)}'],
            ['= Closing Cash in Hand', fmt(closing_balance)],
        ]
        flow_table = Table(flow_data, colWidths=[3.5*inch, 2.5*inch])
        flow_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
            # Collections row green
            ('TEXTCOLOR', (1, 2), (1, 2), colors.HexColor('#16a34a')),
            # Loans & expenses rows red
            ('TEXTCOLOR', (1, 3), (1, 4), colors.HexColor('#dc2626')),
            # Closing row highlight
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e8f5e9')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 11),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#f8f9fa')]),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ]))
        if closing_balance < 0:
            flow_table.setStyle(TableStyle([
                ('TEXTCOLOR', (1, -1), (1, -1), colors.HexColor('#dc2626')),
            ]))
        elements.append(flow_table)
        elements.append(Spacer(1, 15))

        # ---- Online Transactions (if any) ----
        if online_collections > 0 or online_loans_given > 0:
            elements.append(Paragraph('Online Transactions', section_style))
            online_data = [
                ['Item', 'Amount'],
                ['Online Collections', fmt(online_collections)],
                ['Online Loans Given', fmt(online_loans_given)],
            ]
            online_table = Table(online_data, colWidths=[3.5*inch, 2.5*inch])
            online_table.setStyle(TableStyle([
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
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ]))
            elements.append(online_table)
            elements.append(Spacer(1, 15))

        # ---- New Loans Given ----
        if new_loans:
            elements.append(Paragraph(f'New Loans Given ({len(new_loans)})', section_style))
            nl_data = [['Customer', 'Loan Type', 'Amount', 'Method', 'DC Deduction']]
            total_principal = Decimal('0')
            for loan in new_loans:
                dc_ded = loan.get('dc_deduction_amount') or 0
                dc_display = fmt(Decimal(str(dc_ded))) if loan['loan_type'] == 'DC Loan' and dc_ded > 0 else '-'
                nl_data.append([
                    loan['customer__name'],
                    loan['loan_type'],
                    fmt(loan['principal_amount']),
                    (loan.get('payment_method') or 'cash').title(),
                    dc_display,
                ])
                total_principal += loan['principal_amount']
            nl_data.append(['Total', '', fmt(total_principal), '', ''])
            nl_table = Table(nl_data, colWidths=[1.8*inch, 1.3*inch, 1.2*inch, 1.0*inch, 1.2*inch])
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
                ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ]))
            elements.append(nl_table)
            elements.append(Spacer(1, 15))

        # ---- Expenses ----
        if expense_list:
            elements.append(Paragraph(f'Expenses ({len(expense_list)})', section_style))
            exp_data = [['Description', 'Amount']]
            for exp in expense_list:
                exp_data.append([exp['description'], fmt(exp['amount'])])
            exp_data.append(['Total', fmt(expenses_total)])
            exp_table = Table(exp_data, colWidths=[4.0*inch, 2.0*inch])
            exp_table.setStyle(TableStyle([
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
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ]))
            elements.append(exp_table)
            elements.append(Spacer(1, 15))

        # ---- Revenue Table ----
        elements.append(Paragraph("Today's Revenue", section_style))
        rev_data = [
            ['Source', 'Amount'],
            ['DC Deduction', fmt(dc_deduction)],
            ['Monthly Interest', fmt(monthly_interest)],
            ['DL Interest', fmt(dl_interest)],
            ['DC Interest', fmt(dc_interest)],
            ['Total Revenue', fmt(total_revenue)],
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
            ('TEXTCOLOR', (1, -1), (1, -1), colors.HexColor('#16a34a')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#f8f9fa')]),
            ('TOPPADDING', (0, 0), (-1, -1), 7),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ]))
        elements.append(rev_table)

        # Footer
        elements.append(Spacer(1, 30))
        footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8,
                                       textColor=colors.HexColor('#999999'), alignment=TA_CENTER)
        elements.append(Paragraph(f"Generated on {date.today().strftime('%d %b %Y')}", footer_style))

        doc.build(elements)
        buffer.seek(0)

        filename = f"cashbook_{target_date.isoformat()}"
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}.pdf"'
        return response
