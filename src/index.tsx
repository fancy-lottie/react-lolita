import React from 'react';
import useLolita from './useLolita';
import type { ReactLolitaProps } from './type';

const ReactLolita = ({className,style, path, play}: ReactLolitaProps) => {
  const { ref } = useLolita(lolita => {
    // if (replaceData) {
    //   await lolita.replace(replaceData);
    // }
    if (!play) {
      // 无 play 参数时默认循环播放 ALL
      lolita.playAnimation({
        name: 'ALL',
        playCount: 0,
      });
    } else {
      lolita.playAnimation(play);
    }
  }, { path }, [play]);

  return (
    <div className={className} style={style} ref={ref}></div>
  );
};
export default ReactLolita;