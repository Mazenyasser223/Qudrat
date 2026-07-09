import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

const ExamTimer = ({ timeLimit, initialTimeSpent = 0, onTimeUp, onWarning, onTimeUpdate }) => {
  const totalSeconds = timeLimit * 60;
  const [timeLeft, setTimeLeft] = useState(Math.max(totalSeconds - initialTimeSpent, 0));
  const [warningShown, setWarningShown] = useState(false);
  const [hasTriggeredTimeUp, setHasTriggeredTimeUp] = useState(false);

  useEffect(() => {
    const spent = initialTimeSpent || 0;
    setTimeLeft(Math.max(totalSeconds - spent, 0));
    setWarningShown(spent >= totalSeconds - 300);
    setHasTriggeredTimeUp(false);
  }, [timeLimit, initialTimeSpent, totalSeconds]);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (!hasTriggeredTimeUp) {
        setHasTriggeredTimeUp(true);
        onTimeUpdate?.(totalSeconds);
        onTimeUp();
      }
      return;
    }

    // Show warning when 5 minutes left
    if (timeLeft <= 300 && !warningShown) {
      onWarning();
      setWarningShown(true);
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newTimeLeft = prev - 1;
        if (newTimeLeft >= 0) {
          // Calculate time spent and notify parent component
          if (onTimeUpdate) {
            const timeSpent = totalSeconds - newTimeLeft;
            onTimeUpdate(timeSpent);
          }
        }
        return Math.max(newTimeLeft, 0);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onTimeUp, onWarning, warningShown, hasTriggeredTimeUp, onTimeUpdate, totalSeconds]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeLeft <= 60) return 'text-red-600 bg-red-100';
    if (timeLeft <= 300) return 'text-orange-600 bg-orange-100';
    return 'text-blue-600 bg-blue-100';
  };

  const getTimerIcon = () => {
    if (timeLeft <= 60) return <AlertTriangle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  return (
    <div className={`flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-lg ${getTimerColor()}`}>
      {getTimerIcon()}
      <span className="font-mono font-semibold">
        {formatTime(timeLeft)}
      </span>
    </div>
  );
};

export default ExamTimer;
