'use client';

import CreditRouter from '../../components/CreditRouter';
import CRMLayout from '../../components/crm/CRMLayout';
import InboxContent from '../../components/crm/InboxContent';

export default function InboxPage(): React.ReactElement {
  return (
    <CRMLayout
      tenant="readyride"
      dealerName="ReadyRide"
      inboxContent={<InboxContent tenant="readyride" dealerName="ReadyRide" defaultTransferPhone="6139839834" />}
      creditRouterContent={<CreditRouter tenant="readyride" />}
    />
  );
}
