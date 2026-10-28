import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
from reportlab.lib.units import inch
import logging

logger = logging.getLogger(__name__)

class ReportGenerator:
    """
    Generates SOC-grade PDF analysis reports and sanitized CSV exports.
    Utilizes ReportLab to construct multi-page security assessments.
    """

    @staticmethod
    def generate_pdf_report(analysis_data: dict, alerts_data: list, output_filepath: str):
        """
        Builds a professional executive cybersecurity assessment PDF report.
        """
        os.makedirs(os.path.dirname(output_filepath), exist_ok=True)
        doc = SimpleDocTemplate(
            output_filepath,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Custom styles for dark SOC theme aesthetic on paper
        header_title_style = ParagraphStyle(
            'HeaderTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#0f172a')
        )
        subtitle_style = ParagraphStyle(
            'SubTitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=11,
            leading=15,
            textColor=colors.HexColor('#475569')
        )
        section_heading = ParagraphStyle(
            'SectionHeading',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=14,
            leading=18,
            textColor=colors.HexColor('#1e293b'),
            spaceBefore=14,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9.5,
            leading=13.5,
            textColor=colors.HexColor('#334155')
        )
        callout_style = ParagraphStyle(
            'Callout',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=9,
            leading=13,
            textColor=colors.HexColor('#0369a1')
        )

        story = []

        # 1. Header Banner
        story.append(Paragraph("CYBERSECURITY RISK DETECTOR", header_title_style))
        story.append(Paragraph("AI-Powered Network Traffic & Security Analytics Report", subtitle_style))
        story.append(Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')} | Platform: SOC Analytics Engine v1.0", subtitle_style))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#2563eb'), spaceBefore=8, spaceAfter=14))

        # 2. Executive Summary
        story.append(Paragraph("1. Executive Summary", section_heading))
        row_count = analysis_data.get('row_count', 0)
        anomaly_count = analysis_data.get('anomaly_count', 0)
        risk_summary = analysis_data.get('risk_summary', {})
        
        summary_text = (
            f"This automated security analytics report details machine learning evaluation of dataset "
            f"<b>{analysis_data.get('dataset_filename', 'Unknown')}</b>. A total of <b>{row_count:,}</b> records were evaluated. "
            f"The detection pipeline identified <b>{anomaly_count:,}</b> statistical anomalies "
            f"({(anomaly_count / max(1, row_count) * 100):.1f}% of evaluated traffic). "
            f"Identified records were triaged by risk severity, revealing "
            f"<b>{risk_summary.get('Critical', 0)} Critical</b>, <b>{risk_summary.get('High', 0)} High</b>, "
            f"<b>{risk_summary.get('Medium', 0)} Medium</b>, and <b>{risk_summary.get('Low', 0)} Low</b> severity indicators."
        )
        story.append(Paragraph(summary_text, body_style))
        story.append(Spacer(1, 10))

        # Risk Distribution Table
        dist_data = [
            [
                Paragraph("<b>Metric</b>", body_style),
                Paragraph("<b>Total Records</b>", body_style),
                Paragraph("<b>Critical Risk</b>", body_style),
                Paragraph("<b>High Risk</b>", body_style),
                Paragraph("<b>Medium Risk</b>", body_style),
                Paragraph("<b>Low Risk</b>", body_style)
            ],
            [
                Paragraph("Count", body_style),
                Paragraph(f"{row_count:,}", body_style),
                Paragraph(f"{risk_summary.get('Critical', 0):,}", body_style),
                Paragraph(f"{risk_summary.get('High', 0):,}", body_style),
                Paragraph(f"{risk_summary.get('Medium', 0):,}", body_style),
                Paragraph(f"{risk_summary.get('Low', 0):,}", body_style)
            ]
        ]
        t = Table(dist_data, colWidths=[1.1*inch, 1.2*inch, 1.2*inch, 1.2*inch, 1.2*inch, 1.1*inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(t)
        story.append(Spacer(1, 14))

        # 3. Detection Methodology
        story.append(Paragraph("2. Detection Methodology & Engine Details", section_heading))
        methodology_text = (
            "The analytics engine utilizes an ensemble architecture incorporating unsupervised Isolation Forest "
            "for unknown anomaly detection, alongside optional supervised Random Forest classification when validated ground-truth "
            "labels are present. Feature vectors undergo schema normalization, robust scaling, and categorical encoding. "
            "A rule-assisted risk scoring engine correlates ML anomaly scores with telemetry heuristics including targeted ports "
            "(e.g., ports 4444, 3389, 445, 22), data egress volume anomalies, and elevated connection failure ratios."
        )
        story.append(Paragraph(methodology_text, body_style))
        story.append(Spacer(1, 8))
        story.append(Paragraph(
            "<b>Important Analytical Disclaimer:</b> Detected anomalies represent statistical divergence from baseline behavior. "
            "Anomalies require human security analyst investigation and do not represent confirmed attacks.",
            callout_style
        ))
        story.append(Spacer(1, 14))

        # 4. Critical & High Priority Security Alerts
        story.append(Paragraph("3. Priority Security Alerts (Top Findings)", section_heading))
        
        # Grab top 10 critical/high alerts
        top_alerts = [a for a in alerts_data if a.get('severity') in ['Critical', 'High']][:10]
        if not top_alerts:
            top_alerts = alerts_data[:10]

        if top_alerts:
            alert_rows = [
                [
                    Paragraph("<b>Severity</b>", body_style),
                    Paragraph("<b>Risk</b>", body_style),
                    Paragraph("<b>Source IP</b>", body_style),
                    Paragraph("<b>Dest IP : Port</b>", body_style),
                    Paragraph("<b>Reason & Indicators</b>", body_style)
                ]
            ]
            for a in top_alerts:
                src = a.get('source_ip') or 'N/A'
                dst = a.get('destination_ip') or 'N/A'
                port = a.get('relevant_features', {}).get('destination_port') or ''
                dst_port_str = f"{dst} : {port}" if port else str(dst)
                sev = a.get('severity', 'Medium')
                score = a.get('risk_score', 0)
                reason = a.get('detection_reason', '')[:100]

                alert_rows.append([
                    Paragraph(f"<b>{sev}</b>", body_style),
                    Paragraph(f"{score}/100", body_style),
                    Paragraph(str(src), body_style),
                    Paragraph(dst_port_str, body_style),
                    Paragraph(reason, body_style)
                ])

            at = Table(alert_rows, colWidths=[1.0*inch, 0.7*inch, 1.4*inch, 1.5*inch, 2.6*inch])
            at.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ]))
            story.append(at)
        else:
            story.append(Paragraph("No critical or high severity alerts identified in this analysis.", body_style))

        story.append(Spacer(1, 14))

        # 5. Suggested Defensive Actions & Limitations
        story.append(Paragraph("4. Recommended Defensive Actions & Mitigation", section_heading))
        recs = [
            "1. <b>Isolate & Triage Endpoints:</b> Cross-reference flagged source IPs with DHCP logs and host asset registries.",
            "2. <b>Port & Protocol Verification:</b> Review firewall access control lists for unusual traffic targeting non-standard administrative ports (e.g., 4444, 1337, 3389).",
            "3. <b>Credential Audit:</b> For hosts exhibiting high failed-connection ratios, inspect Active Directory / Kerberos / SSH authentication logs for brute-force patterns.",
            "4. <b>Egress Inspection:</b> Review NetFlow and Proxy egress logs for unexpected external transfers from hosts flagged with high transfer volumes.",
            "5. <b>Threat Hunting:</b> Ingest indicators of compromise (IoCs) into SIEM/EDR for real-time rule correlation across enterprise fleet."
        ]
        for r in recs:
            story.append(Paragraph(r, body_style))
            story.append(Spacer(1, 4))

        story.append(Spacer(1, 10))
        story.append(Paragraph("5. Limitations of Analysis", section_heading))
        limitations = (
            "• Machine learning models operate on observed statistical distributions; novel attack techniques or encrypted payload contents "
            "may not present visible deviations in metadata features.<br/>"
            "• Baseline model drift may occur if network topologies or standard user behaviors shift significantly over time.<br/>"
            "• Absence of anomalies does not guarantee the complete absence of stealthy adversary persistence."
        )
        story.append(Paragraph(limitations, body_style))

        # Build document
        doc.build(story)
        logger.info(f"Report generated successfully at {output_filepath}")
        return output_filepath
