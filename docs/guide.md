## 快速开始

传入 lottie 的 json 地址，即可无限循环播放

```jsx
import React, { useState} from 'react';
import ReactLolita from 'react-lolita';

export default () => {
  return (
    <ReactLolita
      path="https://gw.alipayobjects.com/os/OasisHub/3ccdf4d8-78e6-48c9-b06e-9e518057d144/data.json"
      style={{ width: '200px' }}
    />
  );
}
```

可以通过 play 属性控制播放的起止帧数、播放次数等

```jsx
import React, { useState} from 'react';
import ReactLolita from 'react-lolita';

export default () => {
  return (
    <ReactLolita
      path="https://gw.alipayobjects.com/os/OasisHub/b0ba88aa-9eeb-4e97-88d9-6b35f730544d/data.json"
      play={[
        { segments: [0, 120], playCount: 1 },  // 先播放 0 ~ 120 帧一次
        { segments: [121, 180], playCount: 0 }, // 然后无限循环最后 121 ~ 180 帧
      ]}
      style={{ width: '200px' }}
    />
  );
}
```