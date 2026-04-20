'use client';

import CreditRouter from '../../components/CreditRouter';
import CRMLayout from '../../components/crm/CRMLayout';
import InboxContent from '../../components/crm/InboxContent';

export default function InboxPage(): React.ReactElement {
  return (
    <CRMLayout
      tenant="readycar"
      dealerName="ReadyCar"
      inboxContent={<InboxContent tenant="readycar" dealerName="ReadyCar" defaultTransferPhone="6133634494" />}
      creditRouterContent={<CreditRouter tenant="readycar" />}
    />
  );
}
