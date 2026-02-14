
import React from 'react';
/* Import Switch and Redirect instead of Routes and Navigate for React Router v5 */
import { HashRouter as Router, Switch, Route, Redirect } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import MailList from './components/MailList';
import Settings from './components/Settings';
import LetterCreator from './components/LetterCreator';
import AttendanceCreator from './components/AttendanceCreator';
import HonorManager from './components/HonorManager';
import { MailType } from './types';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        {/* Use Switch instead of Routes for v5 */}
        <Switch>
          {/* Use component prop and exact for root path in v5 */}
          <Route exact path="/" component={Dashboard} />
          {/* Use render prop to pass parameters in v5 */}
          <Route 
            path="/inbox" 
            render={() => <MailList type={MailType.INCOMING} />} 
          />
          <Route 
            path="/outbox" 
            render={() => <MailList type={MailType.OUTGOING} />} 
          />
          <Route path="/create" component={LetterCreator} />
          <Route path="/attendance" component={AttendanceCreator} />
          <Route path="/honor" component={HonorManager} />
          <Route path="/settings" component={Settings} />
          {/* Use Redirect instead of Navigate for catch-all in v5 */}
          <Redirect to="/" />
        </Switch>
      </Layout>
    </Router>
  );
};

export default App;
