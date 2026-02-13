import React from 'react';
import useScrollAnimation from '../../hooks/useScrollAnimation';

const AnimatedSection = ({
  children,
  animation = 'fadeInUp',
  delay = 0,
  duration = 0.6,
  threshold = 0.1,
  className = '',
  triggerOnce = true
}) => {
  const { elementRef, isVisible } = useScrollAnimation({
    threshold,
    triggerOnce
  });

  const animationStyle = {
    transition: `all ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
    transitionDelay: `${delay}s`,
  };

  const getAnimationClasses = () => {
    const baseClass = 'animated-element';
    const animationClass = isVisible ? `${animation}-visible` : animation;
    return `${baseClass} ${animationClass} ${className}`;
  };

  return (
    <div
      ref={elementRef}
      className={getAnimationClasses()}
      style={animationStyle}
    >
      {children}
    </div>
  );
};

export default AnimatedSection;