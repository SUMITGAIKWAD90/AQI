import React, { useEffect } from 'react';

const DetailModal = ({ isOpen, onClose, content }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="modal show" onClick={(e) => {
            if (e.target.classList.contains('modal')) {
                onClose();
            }
        }}>
            <div className="modal-content">
                <span className="close-btn" onClick={onClose}>&times;</span>
                <div id="modal-body" dangerouslySetInnerHTML={{ __html: content }}>
                </div>
            </div>
        </div>
    );
};

export default DetailModal;
