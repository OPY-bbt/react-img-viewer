import React from 'react';
import { hot } from 'react-hot-loader/root';
import ReactImgViewer from '../../src/react-img-viewer';

import hero1 from './images/hero1.jpg';
import hero2 from './images/hero2.jpg';
import hero3 from './images/hero3.jpg';
import hero4 from './images/hero4.jpg';
import hero5 from './images/hero5.jpg';
import hero6 from './images/hero6.jpg';
import hero7 from './images/hero7.jpg';

const IMGS = [hero1, hero2, hero3,
  hero4, hero5, hero6, hero7]

class App extends React.Component {
  state = {
    isOpen: true,
    curIdx: 0 
  }

  handleOpen = () => {
    this.setState({
      isOpen: !this.state.isOpen,
    });
  }

  handleNext = () => {
    const { curIdx } = this.state;
    this.setState({
      curIdx: (curIdx + IMGS.length + 1) % IMGS.length,
    });
  }

  handlePrev = () => {
    const { curIdx } = this.state;
    this.setState({
      curIdx: (curIdx + IMGS.length - 1) % IMGS.length,
    });
  }

  render() {
    const {
      isOpen,
      curIdx
    } = this.state;

    return (
      <div>
        <button onClick={this.handleOpen}>open</button>
        <ReactImgViewer
          prevSrc={IMGS[(curIdx + IMGS.length - 1) % IMGS.length]}
          mainSrc={IMGS[(curIdx + IMGS.length) % IMGS.length]}
          nextSrc={IMGS[(curIdx + IMGS.length + 1) % IMGS.length]}
          visible={isOpen}
          onNext={this.handleNext}
          onPrev={this.handlePrev}
          title="heroes"
        />
      </div>
    );
  }
}

export default hot(App);