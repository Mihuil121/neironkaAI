'use client';

import React from 'react';
import Image from 'next/image';
import AnimatedBotBall from './AnimatedBotBall';
import aiphoto from '../image/AI.png';

interface BotAvatarProps {
  size: number;
  isGenerating?: boolean;
  className?: string;
}

const BotAvatar: React.FC<BotAvatarProps> = ({ size, isGenerating = false, className = '' }) => {
  if (isGenerating) {
    return <AnimatedBotBall size={size} />;
  }

  return (
    <Image 
      src={aiphoto} 
      alt="AI Bot" 
      width={size} 
      height={size} 
      className={className}
      style={{ borderRadius: '50%' }}
    />
  );
};

export default BotAvatar; 