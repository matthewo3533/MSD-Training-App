import { useState } from 'react';

interface RatingSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

const RatingSelector: React.FC<RatingSelectorProps> = ({ value, onChange }) => {
  const [hovered, setHovered] = useState<number | null>(null);

  const getButtonColor = (score: number) => {
    if (score === 0) {
      return 'bg-gray-700 hover:bg-gray-600 text-gray-300';
    }
    if (score <= 4) {
      return 'bg-red-600 hover:bg-red-500 text-white';
    }
    if (score <= 6) {
      return 'bg-yellow-600 hover:bg-yellow-500 text-white';
    }
    if (score <= 8) {
      return 'bg-blue-600 hover:bg-blue-500 text-white';
    }
    return 'bg-green-600 hover:bg-green-500 text-white';
  };

  const getButtonColorSelected = (score: number) => {
    if (score === 0) {
      return 'bg-gray-600 ring-2 ring-gray-400 text-white';
    }
    if (score <= 4) {
      return 'bg-red-700 ring-2 ring-red-400 text-white';
    }
    if (score <= 6) {
      return 'bg-yellow-700 ring-2 ring-yellow-400 text-white';
    }
    if (score <= 8) {
      return 'bg-blue-700 ring-2 ring-blue-400 text-white';
    }
    return 'bg-green-700 ring-2 ring-green-400 text-white';
  };

  const getLabel = (score: number) => {
    if (score === 0) return 'Not Rated';
    if (score <= 2) return 'Poor';
    if (score <= 4) return 'Below Average';
    if (score <= 6) return 'Average';
    if (score <= 8) return 'Good';
    return 'Excellent';
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="flex flex-wrap gap-2 items-center">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
          const isSelected = value === score;
          const shouldHighlight = hovered !== null ? hovered >= score : false;
          const baseClasses = 'w-11 h-11 rounded-lg font-bold text-sm transition-all duration-200 cursor-pointer flex items-center justify-center border-2 hover:scale-110 active:scale-95';
          const colorClasses = isSelected
            ? getButtonColorSelected(score)
            : shouldHighlight
            ? getButtonColor(score)
            : 'bg-primary-tertiary hover:bg-primary-secondary border-primary-border text-primary-text hover:border-accent-primary';
          
          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              onMouseEnter={() => setHovered(score)}
              onMouseLeave={() => setHovered(null)}
              className={`${baseClasses} ${colorClasses} ${
                isSelected ? 'scale-110 shadow-xl ring-2 ring-offset-2 ring-offset-primary-tertiary' : 'hover:scale-105'
              }`}
              title={`${score}/10 - ${getLabel(score)}`}
            >
              {score}
            </button>
          );
        })}
        {value > 0 && (
          <div className="ml-auto px-4 py-2 bg-primary-secondary rounded-lg border border-primary-border shadow-sm">
            <span className="text-primary-text font-bold text-lg">{value}</span>
            <span className="text-primary-text-secondary text-sm ml-1">/10</span>
            <div className="text-xs text-primary-text-muted mt-0.5">{getLabel(value)}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RatingSelector;

