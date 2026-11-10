import React, { ReactNode, useEffect, useRef } from 'react';

interface SensorCardProps {
  title: string;
  icon: ReactNode;
  onStart: () => void;
  onStop: () => void;
  isConnected: boolean;
  children: ReactNode;
  lastUpdated?: string;
}

const SensorCard: React.FC<SensorCardProps> = ({
  title,
  icon,
  children,
  lastUpdated
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const adjustStyles = () => {
    const card = cardRef.current;
    if (!card) return;

    const width = card.clientWidth;
    const height = card.clientHeight;

    // Adjust font sizes based on container size
    if (width < 200) {
      card.classList.add('sensor-card-xs');
      card.classList.remove('sensor-card-sm', 'sensor-card-md', 'sensor-card-lg');
    } else if (width < 300) {
      card.classList.add('sensor-card-sm');
      card.classList.remove('sensor-card-xs', 'sensor-card-md', 'sensor-card-lg');
    } else if (width < 400) {
      card.classList.add('sensor-card-md');
      card.classList.remove('sensor-card-xs', 'sensor-card-sm', 'sensor-card-lg');
    } else {
      card.classList.add('sensor-card-lg');
      card.classList.remove('sensor-card-xs', 'sensor-card-sm', 'sensor-card-md');
    }

    // Adjust content area height based on card height
    const contentArea = card.querySelector('.sensor-content-area') as HTMLElement;
    if (contentArea) {
      const headerHeight = card.querySelector('.sensor-header')?.clientHeight || 0;
      const footerHeight = card.querySelector('.sensor-footer')?.clientHeight || 0;
      const availableHeight = height - headerHeight - footerHeight - 16; // Subtract padding

      contentArea.style.height = `${Math.max(50, availableHeight)}px`;
    }
  };

  // Set up resize observer to detect changes in the card's size
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    adjustStyles();

    const resizeObserver = new ResizeObserver(() => {
      adjustStyles();
    });

    resizeObserver.observe(card);

    // Listen for GridStack resize events
    const handleGridStackResize = () => {
      setTimeout(adjustStyles, 0);
    };

    document.addEventListener('gridstack.resize', handleGridStackResize);
    document.addEventListener('gridstack.resizestop', handleGridStackResize);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      document.removeEventListener('gridstack.resize', handleGridStackResize);
      document.removeEventListener('gridstack.resizestop', handleGridStackResize);
    };
  }, []);

  return (

    <div ref={cardRef} className="sensor-card relative flex h-full w-full flex-col rounded-xl border-2 border-mountain-mist-300 bg-mountain-mist-50 text-shark-900 shadow-sm dark:border-shark-600 dark:bg-shark-900 dark:text-shark-50">
      <div className="sensor-header flex items-center py-1.5 pl-3 pr-14">
        <div className="flex min-w-0 items-center gap-2">
          <div className="shrink-0 text-lg text-shark-700 dark:text-shark-100">
            {icon}
          </div>
          <h3 className="truncate text-sm font-semibold text-shark-700 dark:text-shark-100">{title}</h3>
        </div>
      </div>

      <div className="sensor-content-area flex grow items-center justify-center overflow-hidden px-2 py-1">
        {children}
      </div>

      <div className="sensor-footer flex items-center justify-between px-3 py-1">
        <div className="text-xs text-mountain-mist-600 dark:text-mountain-mist-300">
          {lastUpdated && (
            <span>Updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
          )}
        </div>

      </div>
    </div>
  );
};

export default SensorCard;