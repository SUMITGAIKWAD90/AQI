import React from 'react';

const SolutionCard = ({
    id,
    title,
    description,
    imageSrc,
    altText,
    onClick
}) => {
    const handleClick = () => {
        if (onClick) {
            onClick(id);
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleClick();
        }
    };

    return (
        <article
            className="solution-card"
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
        >
            <div className="card-image">
                <img src={imageSrc} alt={altText || title} loading="lazy" />
                <div className="overlay" />
            </div>
            <div className="card-content">
                <h3>{title}</h3>
                <p>{description}</p>
            </div>
        </article>
    );
};

export default SolutionCard;
