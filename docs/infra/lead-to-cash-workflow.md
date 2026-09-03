# EljayMedia Creative — Lead-to-Cash Operating Workflow

**Version:** 1.0
**Effective:** 2026-09-03
**Owner:** Revenue Operations

---

## 1. Workflow overview

```
Lead Source → Perfex Lead → Qualification → Discovery → Proposal → 
Approval/Contract → Invoice/Deposit → Delivery → Google Drive → 
Weekly Status → Completion → Renewal
```

---

## 2. Lead capture

### Sources
- Website contact form
- WhatsApp intake
- Referral
- Outbound prospecting

### Perfex configuration
- Required fields: name, company, email, phone, service interest, budget range
- Lead ownership: assigned to business development
- Response SLA: 24 hours
- Loss reasons: budget, timing, chose competitor, no response, not qualified

---

## 3. Qualification stages

| Stage | Criteria | Exit condition |
|-------|----------|----------------|
| New | Unqualified lead | Moved to qualified or lost |
| Qualified | Budget, authority, need, timeline confirmed | Discovery scheduled |
| Discovery | Needs assessment complete | Proposal sent |
| Proposal | Proposal delivered | Won or lost |
| Won | Contract signed / deposit received | Onboarding started |
| Lost | Not pursuing | Reason documented |

---

## 4. Won deal automation (n8n trigger)

On Perfex status change to "Won":

1. Create client onboarding checklist
2. Create delivery project/task references
3. Create Google Drive client folder structure
4. Send asset request to client
5. Schedule first client update reminder
6. Verify invoice/deposit status before delivery begins

---

## 5. Google Drive folder structure

```
/Clients/[Client Name]/
├── 01_Contracts/
├── 02_Proposals/
├── 03_Assets/
│   ├── Brand_Guidelines/
│   ├── Logos/
│   └── Reference/
├── 04_Deliverables/
│   ├── Drafts/
│   └── Final/
├── 05_Communication/
└── 06_Invoices/
```

---

## 6. Metrics tracked

- Lead response time
- Proposal turnaround time
- Win rate (won / qualified)
- Onboarding time
- Expected revenue per lead
- Client satisfaction (post-project)

---

## 7. Version history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | Revenue Operations | Initial release |
