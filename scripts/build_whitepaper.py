from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "Whitepaper_Engineering_Drawing_2026.pdf"
NAVY, BLUE, SLATE, BORDER = map(colors.HexColor, ("#0F172A", "#155EEF", "#475569", "#D8E1EC"))
styles = getSampleStyleSheet()
for name, size, leading, color, bold in [
    ("kicker", 9, 13, BLUE, True), ("coverTitle", 30, 36, NAVY, True),
    ("h1x", 21, 27, NAVY, True), ("h2x", 14, 19, NAVY, True),
    ("bodyx", 9.6, 15, SLATE, False), ("smallx", 8, 11, SLATE, False),
    ("thead", 8.2, 10, colors.white, True), ("cell", 8.2, 11, NAVY, False),
]:
    styles.add(ParagraphStyle(name=name, fontName="Helvetica-Bold" if bold else "Helvetica", fontSize=size, leading=leading, textColor=color, spaceAfter=8))

def p(text, style="bodyx"): return Paragraph(text, styles[style])
def heading(title, kicker): return [p(kicker.upper(), "kicker"), p(title, "h1x")]
def table(headers, rows, widths):
    data = [[p(x, "thead") for x in headers]] + [[p(str(x), "cell") for x in row] for row in rows]
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY), ("GRID", (0, 0), (-1, -1), .4, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    return t
def callout(text, background="#ECFDF3"):
    t = Table([[p(text, "bodyx")]], colWidths=[170 * mm])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(background)), ("BOX", (0, 0), (-1, -1), .5, BORDER), ("LEFTPADDING", (0, 0), (-1, -1), 13), ("RIGHTPADDING", (0, 0), (-1, -1), 13), ("TOPPADDING", (0, 0), (-1, -1), 12), ("BOTTOMPADDING", (0, 0), (-1, -1), 12)]))
    return t
def footer(canvas, doc):
    canvas.saveState(); canvas.setStrokeColor(BORDER); canvas.line(20*mm, 15*mm, 190*mm, 15*mm)
    canvas.setFont("Helvetica", 8); canvas.setFillColor(SLATE)
    canvas.drawString(20*mm, 9*mm, "Engineering Drawing | EDG Whitepaper | Version 2.0 | 23 September 2026")
    canvas.drawRightString(190*mm, 9*mm, f"Page {doc.page}"); canvas.restoreState()

def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=20*mm, bottomMargin=22*mm, title="Engineering Drawing EDG Whitepaper", author="Engineering Drawing")
    s = [Spacer(1, 29*mm), p("ENGINEERING DRAWING | EDG", "kicker"), p("A transparent token framework for industrial innovation", "coverTitle"),
         p("EDG supports the Engineering Drawing ecosystem: AI-assisted industrial design, engineering workflows, and a community focused on more efficient process systems.", "bodyx"), Spacer(1, 8*mm),
         table(["Network", "Token supply", "Token contract"], [["BNB Smart Chain (Chain ID 56)", "99,999,999 EDG | 18 decimals", "0xa90Cc0137FDA4285Eaa6da0f7a5118A1432b2a76"]], [49*mm, 48*mm, 73*mm]), Spacer(1, 12*mm),
         callout("<b>Completed on-chain lock:</b> 39,999,999.60 EDG, equal to 40% of the fixed supply, is locked for the Environment Program and Team &amp; Management allocations."), Spacer(1, 10*mm),
         p("Version 2.0 records the fixed-date lock transactions completed on 22 September 2026. This document is informational only; it is not investment advice, an offer, or a promise of value.", "smallx"), PageBreak()]
    s += heading("EDG at a glance", "Overview") + [
        p("Engineering Drawing develops tools and workflows for industrial process design. EDG is intended to support access, participation, and ecosystem activity around the platform. The token does not represent equity, ownership, or a claim on company revenue."),
        p("On-chain records are the source of truth for token balances, transfers, lock status, and unlock conditions. Users should independently verify contract activity before acting."), p("Official contracts", "h2x"),
        table(["Resource", "Address / link", "Purpose"], [["EDG token", "bscscan.com/token/0xa90Cc0137FDA4285Eaa6da0f7a5118A1432b2a76", "Fixed-supply BEP-20 token"], ["Presale contract", "bscscan.com/address/0x944483c8083827A8BF09c12cFC57DB6a5b22697A", "Presale contract reference"], ["Lock provider", "bscscan.com/address/0x407993575c91ce7643a4d4cCACc9A98c36eE1BBE", "PinkLock contract used for the disclosed locks"]], [32*mm, 91*mm, 47*mm]),
        p("Presale stages", "h2x"), table(["Stage", "Allocation", "Indicative price"], [["Stage 1", "5% of supply", "0.02 USDT per EDG"], ["Stage 2", "10% of supply", "0.03 USDT per EDG"], ["Stage 3", "15% of supply", "0.05 USDT per EDG"]], [45*mm, 62*mm, 63*mm]),
        p("The site publishes the official contract references, presale stages, and allocation model. Any future allocation or lock change should be accompanied by a public update and the relevant on-chain transaction reference."), PageBreak()]
    s += heading("Allocation and completed locks", "Tokenomics") + [
        p("EDG has a fixed supply of 99,999,999 tokens. The Environment and Team allocations are locked in six separate fixed-date records, rather than daily or continuous vesting."),
        table(["Allocation", "Share", "Supply amount", "Status"], [["Community Development / Presale", "30%", "29,999,999.70 EDG", "Presale allocation"], ["Environment Program", "25%", "24,999,999.75 EDG", "Locked in three records"], ["Team & Management", "15%", "14,999,999.85 EDG", "Locked in three records"], ["Marketing & Promotion", "10%", "9,999,999.90 EDG", "Not part of these locks"], ["Liquidity & Risk Management", "20%", "19,999,999.80 EDG", "Not part of these locks"]], [49*mm, 21*mm, 42*mm, 58*mm]), Spacer(1, 8*mm),
        callout("<b>Locked total:</b> 39,999,999.60 EDG. The locks use the confirmed admin wallet as owner and beneficiary."), Spacer(1, 8*mm),
        table(["Lock", "Amount", "Unlock at 00:00 UTC"], [["Environment - Year 1", "9,999,999.90 EDG", "21 August 2027"], ["Environment - Year 2", "9,999,999.90 EDG", "21 August 2028"], ["Environment - Year 3", "4,999,999.95 EDG", "21 August 2029"], ["Team - Year 1", "4,999,999.95 EDG", "21 August 2027"], ["Team - Year 2", "4,999,999.95 EDG", "21 August 2028"], ["Team - Year 3", "4,999,999.95 EDG", "21 August 2029"]], [58*mm, 54*mm, 58*mm]),
        p("The schedule preserves the stated 10%, 10%, 5% Environment pattern and 5%, 5%, 5% Team pattern, measured as percentages of total supply. No tokens from these records are available before their respective dates."), PageBreak()]
    s += heading("Verification, utility, and risk", "Accountability") + [
        p("Verification references", "h2x"), p("The six lock transactions completed on 22 September 2026. The final Team Year 3 transaction is bscscan.com/tx/0x02397fae3eb10c4cf1584b483fa6bf25746e4415da6e35000c19f5349f7ef245. PinkLock and BscScan are the authoritative sources for each lock owner, amount, and unlock timestamp."),
        p("Intended ecosystem utility", "h2x"), p("Engineering Drawing intends to use EDG in connection with platform access, ecosystem participation, community programs, and product capabilities that may be introduced over time. Availability and eligibility are subject to the live product, applicable law, and published terms. EDG does not grant ownership rights, voting rights, dividends, or a guaranteed return."),
        p("Risk disclosure", "h2x"), p("Digital assets involve substantial risk. Prices, liquidity, regulation, taxes, smart-contract behavior, third-party services, and wallet security can change. Transactions are generally irreversible. Never share a seed phrase or private key, and independently verify the purpose of any address before sending assets."),
        p("Founders and official profiles", "h2x"), table(["Profile", "Direct link"], [["Rehan ud-Din", "linkedin.com/in/rehan-ud-din"], ["Alisha Mahmood", "linkedin.com/in/alisha-mahmood-8b01bb20b"], ["Engineering Drawing", "linkedin.com/company/engineeringdrawing"]], [48*mm, 122*mm]), Spacer(1, 10*mm), p("Contact: contact@engineeringdrawing.io | engineeringdrawing.io", "smallx")]
    doc.build(s, onFirstPage=footer, onLaterPages=footer)
    print(OUT)
if __name__ == "__main__": build()
