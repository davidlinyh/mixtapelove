import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import MixTape from './components/MixTape';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MixTape />} />
        <Route path="/mixtape/:id" element={<MixTape />} />
      </Routes>
    </Router>
  );
}

export default App;
