import * as React from "react";
import "./index.css";

import {
  cls,
} from "./utils";

const MIN_ZOOM_LEVEL = 1;
const MAX_ZOOM_LEVEL = 3;
const CLICK_DIFF = 15;
const CLICK_TIMEOUT = 50;
const DOUBLE_CLICK_TIMEOUT = 200;
enum Action { NONE, SWIPE, PINCH, MOVE }

type TouchEvent = React.TouchEvent;

const defaultProps = Object.freeze({});

const initialState = Object.freeze({
  zoomLevel: 1,

  offsetX: 0,
  offsetY: 0,

  offsetImgX: 0,
  offsetImgY: 0,

  isAnimating: false,
  keyIndex: 0,
  nextKeyIndex: 0,

  needImgTransition: false,
});

type Props = {
  visible: boolean;
  imgs: string[];
  prevSrc: string;
  mainSrc: string;
  nextSrc: string;
  onNext: () => void;
  onPrev: () => void;
  children?: never;
  title: string;
} & typeof defaultProps;

type State = typeof initialState;

class ReactImgViewer extends React.Component<Props, State> {
  static readonly defaultProps = defaultProps;

  static getTransform({ x = 0, y = 0, zoom = 1 }) {
    return {
      transform: `translate(${x}px, ${y}px) scale(${zoom}, ${zoom})`,
    };
  }
  readonly state = initialState;

  isDragging: boolean = false;

  startPosX: number = 0;
  startPosY: number = 0;
  startTime: number = 0;

  endPosX: number = 0;
  endPosY: number = 0;
  endTime: number = 0;

  startOffsetImgX: number = 0;
  startOffsetImgY: number = 0;

  endOffsetImgX: number = 0;
  endOffsetImgY: number = 0;

  lastClickTime: number = 0;

  currentAction: Action = Action.NONE;

  refContainer: React.RefObject<HTMLDivElement> = React.createRef();

  refCurrentImg: React.RefObject<HTMLImageElement> = React.createRef();

  componentDidMount() {
    this.refContainer.current.addEventListener("touchmove",
      (e) => e.preventDefault());
  }

  getViewerRect = () => {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    };
  }

  getImgNaturalSizes = (img: HTMLImageElement): number[] => {
    return [
      img.naturalWidth,
      img.naturalHeight,
    ];
  }

  getRealImgSizes = (sizes: number[]): number[] => {
    const { width, height } = this.getViewerRect();
    const [imgW, imgH] = sizes;

    const maxRatio = width / height;
    const srcRatio = imgW / imgH;

    let imgSizes = [width, imgH * width / imgW];
    if (srcRatio < maxRatio) {
      imgSizes = [imgW * height / imgH, height];
    }

    return imgSizes.concat((height - imgSizes[1]) / 2, (width - imgSizes[0]) / 2);
  }

  handleTouchStart = (event: TouchEvent) => {
    switch (event.targetTouches.length) {
      case 1:
        this.handleMoveOrSwipeStart(event);
        break;
      case 2:
        this.handlePinchStart(event);
        break;
      default:
        break;
    }
  }

  handleTouchMove = (event: TouchEvent) => {
    switch (this.currentAction) {
      case Action.SWIPE:
        this.handleSwipeMove(event);
        break;
      case Action.MOVE:
        this.handlePanMove(event);
      default:
        break;
    }
  }

  handleTouchEnd = (event: TouchEvent) => {
    switch (this.currentAction) {
      case Action.SWIPE:
        this.handleSwipeEnd(event);
        break;
      case Action.MOVE:
        this.handlePanMoveEnd(event);
      default:
        break;
    }

    this.currentAction = Action.NONE;
  }

  handleMoveOrSwipeStart = (event: TouchEvent) => {
    const { zoomLevel, offsetImgX, offsetImgY } = this.state;
    const touch = event.targetTouches[0];

    this.currentAction = zoomLevel <= MIN_ZOOM_LEVEL ?
      Action.SWIPE : Action.MOVE;
    this.startPosX = this.endPosX = touch.clientX;
    this.startPosY = this.endPosY = touch.clientY;
    this.startTime = this.endTime = event.timeStamp;

    this.startOffsetImgX = offsetImgX;
    this.startOffsetImgY = offsetImgY;
  }

  handlePanMove = (event: TouchEvent) => {
    const touch = event.targetTouches[0];

    const offsetImgX = this.startOffsetImgX + touch.clientX - this.startPosX;
    const offsetImgY = this.startOffsetImgY + touch.clientY - this.startPosY;

    this.setState({
      offsetImgX,
      offsetImgY,
    });

    this.endOffsetImgX = offsetImgX;
    this.endOffsetImgY = offsetImgY;

    this.endPosX = touch.clientX;
    this.endPosY = touch.clientY;
    this.endTime = event.timeStamp;
  }

  handlePanMoveEnd = (event: TouchEvent) => {
    const { zoomLevel } = this.state;
    const [realWidth, realHeight, paddingTop, paddingLeft] =
      this.getRealImgSizes(this.getImgNaturalSizes(this.refCurrentImg.current));

    // TODO: 需要考虑图片没加载获取不到宽高的情况
    const maxOffsetImgX = realWidth * (zoomLevel - 1) / 2 - paddingLeft;
    const maxOffsetImgY = realHeight * (zoomLevel - 1) / 2 - paddingTop;

    if (Math.abs(this.endOffsetImgX) > maxOffsetImgX) {
      this.setState({
        offsetImgX: this.endOffsetImgX > 0 ? maxOffsetImgX : -maxOffsetImgX,
      });
    }

    if (Math.abs(this.endOffsetImgY) > maxOffsetImgY) {
      this.setState({
        offsetImgY: this.endOffsetImgY > 0 ? maxOffsetImgY : -maxOffsetImgY,
      });
    }

    // 处理单击或者双击事件
    this.handleClick(event);
    this.currentAction = Action.NONE;
  }

  handleClick(event: TouchEvent) {
    // refer: https://stackoverflow.com/questions/49920582/why-mobile-safari-touchevents-have-negative-timestamp
    if (Math.abs(event.timeStamp - this.lastClickTime) <= DOUBLE_CLICK_TIMEOUT) {
      this.handleDoubleClick(event);
      this.lastClickTime = 0;
    } else {
      // handle click
      this.lastClickTime = event.timeStamp;
    }
  }

  handleDoubleClick(event: TouchEvent) {
    const { zoomLevel } = this.state;
    this.setState({
      zoomLevel: zoomLevel === MIN_ZOOM_LEVEL ?
        MAX_ZOOM_LEVEL : MIN_ZOOM_LEVEL,
      needImgTransition: true,
      offsetImgX: 0,
      offsetImgY: 0,
    });

    // 防止对下次双击放大滑动有影响
    this.startOffsetImgX = 0;
    this.startOffsetImgY = 0;
    this.endOffsetImgX = 0;
    this.endOffsetImgY = 0;
  }

  handleSwipeMove = (event: TouchEvent) => {
    const touch = event.targetTouches[0];
    const { isAnimating } = this.state;

    if (isAnimating) {
      return;
    }
    this.setState({
      offsetX: touch.clientX - this.startPosX,
    });

    this.endPosX = touch.clientX;
    this.endPosY = touch.clientY;
    this.endTime = event.timeStamp;
  }

  handleSwipeEnd = (event: TouchEvent) => {
    const { keyIndex } = this.state;

    const diffX = this.endPosX - this.startPosX;
    const diffY = this.endPosY - this.startPosY;
    const diffTime = this.endTime - this.startTime;

    if (Math.abs(diffX) <= CLICK_DIFF &&
        Math.abs(diffY) <= CLICK_DIFF &&
        diffTime <= CLICK_TIMEOUT) {
      // click event
      this.handleClick(event);
      return;
    }

    const duration = event.timeStamp - this.startTime;
    const threshold = this.getViewerRect().width / 2;
    const isFlick = duration < 250 && Math.abs(diffX) > 20;

    let nextKeyIndex = keyIndex;
    if (diffX >= threshold || (isFlick && diffX > 0)) {
      // prev
      nextKeyIndex = keyIndex - 1;
    } else if (diffX <= threshold * -1 || (isFlick && diffX < 0)) {
      // next
      nextKeyIndex = keyIndex + 1;
    } else {
      // restore
    }

    this.setState({
      isAnimating: true,
      offsetX: 0,
      nextKeyIndex,
    });
  }

  handleContainerTransitionEnd = () => {
    const { onNext, onPrev } = this.props;
    const { nextKeyIndex, keyIndex } = this.state;

    if (keyIndex > nextKeyIndex) {
      onPrev();
    } else if (keyIndex < nextKeyIndex) {
      onNext();
    }

    this.setState({
      isAnimating: false,
      keyIndex: nextKeyIndex,
    });
  }

  handleImgTransitionEnd = () => {
    this.setState({
      needImgTransition: false,
    });
  }

  handlePinchStart = (event: TouchEvent) => {
    // const [touch1, touch2] = event.targetTouches;
    // this.currentAction = Action.PINCH;
    // const { offsetX } = this.state;

    // if (offsetX !== 0) {
    //   this.handleMoveOrSwipeStart(event);
    // } else {
    //   console.log(123);
    // }
    // handleMoveOrSwipeStart
  }

  render() {
    const {
      prevSrc, mainSrc, nextSrc,
      visible, title,
    } = this.props;

    const {
      offsetX, offsetY,
      offsetImgX, offsetImgY,
      isAnimating, nextKeyIndex, keyIndex,
      zoomLevel, needImgTransition,
    }  = this.state;

    if (!visible) {
      return null;
    }

    const diffIndex =  nextKeyIndex - keyIndex;

    const containerStyle = {
      ...ReactImgViewer.getTransform({
        x: offsetX - this.getViewerRect().width * (1 + diffIndex),
      }),
      transition: isAnimating ? `transform .3s` : "none",
    };

    const imgStyle = {
      ...ReactImgViewer.getTransform({
        zoom: zoomLevel,
        x: offsetImgX,
        y: offsetImgY,
      }),
      transition: needImgTransition ? `transform .3s` : "none",
    };

    const imgs = (
      [prevSrc, mainSrc, nextSrc].map((img, idx) => (
        <div key={`${img}-${keyIndex + idx - 1}`} className="riv-img__container">
          <img
            className="riv-img"
            ref={idx === 1 ? this.refCurrentImg : undefined}
            src={img}
            style={idx === 1 ? imgStyle : {}}
            onTransitionEnd={this.handleImgTransitionEnd}
          />
        </div>
      ))
    );

    const toolbarCls = cls({
      "riv-toolbar__container": true,
      "riv-toolbar__container--hide": zoomLevel !== MIN_ZOOM_LEVEL,
      "riv-toolbar__container--show": zoomLevel === MIN_ZOOM_LEVEL,
    });

    return (
      <div
        className="riv-outer__container"
        ref={this.refContainer}
      >
        <div
          className="riv-inner__container"
          onTouchStart={this.handleTouchStart}
          onTouchMove={this.handleTouchMove}
          onTouchEnd={this.handleTouchEnd}
          style={containerStyle}
          onTransitionEnd={this.handleContainerTransitionEnd}
        >
          {imgs}
        </div>
        <div className={toolbarCls}>
          <ul className="riv-toolbar riv-toolbar__left">
            <li className="riv-toolbar__item">
              <span className="riv-toolbar__title">{title}</span>
            </li>
          </ul>
        </div>
      </div>
    );
  }
}

export default ReactImgViewer;
