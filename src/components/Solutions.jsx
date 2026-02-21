import { useState } from 'react';
import SolutionCard from './SolutionCard';
import DetailModal from './DetailModal';
import { solutionData } from './data';
import './Solutions.css';

function App() {
  const [activeModalId, setActiveModalId] = useState(null);

  const handleCardClick = (id) => {
    setActiveModalId(id);
  };

  const handleCloseModal = () => {
    setActiveModalId(null);
  };

  const activeContent = solutionData.find(s => s.id === activeModalId)?.modalContent || '';

  return (
    <section className="aqi-solutions-section">
      <div className="container">
        {/* Header Section */}
        <header className="section-header">
          <div className="header-text">
            <h2 className="bold-heading">Air Quality Solutions</h2>
            <p className="subtitle">Explore advanced air quality monitoring & clean air solutions.</p>
          </div>
          <div className="header-nav">
            <button className="nav-btn prev-btn" aria-label="Previous">&larr;</button>
            <button className="nav-btn next-btn" aria-label="Next">&rarr;</button>
          </div>
        </header>

        {/* Solution Cards Grid */}
        <div className="solutions-grid">
          {solutionData.map(solution => (
            <SolutionCard
              key={solution.id}
              id={solution.id}
              title={solution.title}
              description={solution.shortDescription}
              imageSrc={solution.imageSrc}
              altText={solution.title + ' Air Quality'}
              onClick={handleCardClick}
            />
          ))}
        </div>

        {/* Floating CTA */}
        <div className="floating-cta-container">
          <button className="cta-button">
            Get an AQI Monitor <span className="cta-arrow">&rarr;</span> <br />
            <small>Join the Community</small>
          </button>
        </div>
      </div>

      {/* Detail Modal View */}
      <DetailModal
        isOpen={activeModalId !== null}
        onClose={handleCloseModal}
        content={activeContent}
      />
    </section>
  );
}

export default App;
