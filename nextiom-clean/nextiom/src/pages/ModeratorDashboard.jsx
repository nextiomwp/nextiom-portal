import React from 'react';
import { Helmet } from 'react-helmet';
import Dashboard from '@/pages/Dashboard';

function ModeratorDashboard() {
  return (
    <>
      <Helmet>
        <title>Moderator Portal - Nextiom</title>
      </Helmet>
      <Dashboard isModeratorPage={true} />
    </>
  );
}

export default ModeratorDashboard;
