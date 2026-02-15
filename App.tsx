
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import MailList from './components/MailList';
import Settings from './components/Settings';
import LetterCreator from './components/LetterCreator';
import AttendanceCreator from './components/AttendanceCreator';
import HonorManager from './components/HonorManager';
import MonthlyReport from './components/MonthlyReport';
import { MailType } from './types';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route 
            path="/inbox" 
            element={<MailList type={MailType.INCOMING} />} 
          />
          <Route 
            path="/outbox" 
            element={<MailList type={MailType.OUTGOING} />} 
          />
          <Route path="/create" element={<LetterCreator />} />
          <Route path="/attendance" element={<AttendanceCreator />} />
          <Route path="/monthly-report" element={<MonthlyReport />} />
          <Route path="/honor" element={<HonorManager />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
