import * as React from "react";
import "./index.css";

const MIN_ZOOM_LEVEL = 1;
const MAX_ZOOM_LEVEL = 5;
const CLICK_DIFF = 15;
const CLICK_TIMEOUT = 50;
const DOUBLE_CLICK_TIMEOUT = 200;
enum Action { NONE, SWIPE, PINCH, MOVE }

type TouchEvent = React.TouchEvent;

type Props = {
  visible: boolean;
  imgs: string[];
  prevSrc: string;
  mainSrc: string;
  nextSrc: string;
  onNext: () => void;
  onPrev: () => void;
  children?: never;
} & typeof defaultProps;

type State = typeof initialState;

const defaultProps = Object.freeze({});

const initialState = Object.freeze({
  zoomLevel: 1,
  offsetX: 0,
  offsetY: 0,
  isAnimating: false,
  keyIndex: 0,
  nextKeyIndex: 0,
});

class ReactImgViewer extends React.Component<Props, State> {
  static readonly defaultProps = {};

  static getTransform({ x = 0, y = 0, zoom = 1 }) {
    return {
      transform: `translate(${x}px, ${y}px) scale(${zoom}, ${zoom})`,
    };
  }
  readonly state = initialState;

  isDragging: boolean = false;

  startPosX: number;
  startPosY: number;
  startTime: number;

  endPosX: number;
  endPosY: number;
  endTime: number;

  lastClickTime: number;

  currentAction: Action = Action.NONE;

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
        this.handleMove(event);
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
        this.handleMoveEnd(event);
      default:
        break;
    }

    this.currentAction = Action.NONE;
  }

  handleMoveOrSwipeStart = (event: TouchEvent) => {
    const { zoomLevel } = this.state;
    const touch = event.targetTouches[0];
    this.currentAction = zoomLevel <= MIN_ZOOM_LEVEL ?
      Action.SWIPE : Action.MOVE;
    this.startPosX = this.endPosX = touch.clientX;
    this.startPosY = this.endPosY = touch.clientY;
    this.startTime = this.endTime = event.timeStamp;
  }

  handleMove = (event: TouchEvent) => {
    this.endTime = event.timeStamp;
  }

  handleMoveEnd = (event: TouchEvent) => {
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
    });
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

  handleTransitionEnd = () => {
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

  handlePinchStart = (event: TouchEvent) => {
    // const [touch1, touch2] = event.targetTouches;
    // this.currentAction = Action.PINCH;
  }

  render() {
    const { prevSrc, mainSrc, nextSrc, visible } = this.props;
    const { offsetX, isAnimating, nextKeyIndex, keyIndex,
      zoomLevel  }  = this.state;

    if (!visible) {
      return null;
    }

    const diffIndex =  nextKeyIndex - keyIndex;

    const style = {
      ...ReactImgViewer.getTransform({
        x: offsetX - this.getViewerRect().width * (1 + diffIndex),
      }),
      transition: isAnimating ? `transform .3s` : "none",
    };

    const imgs = (
      [prevSrc, mainSrc, nextSrc].map((img, idx) => (
        <div key={`${img}-${keyIndex + idx - 1}`} className="riv_img-container">
          <img
            className="riv_img"
            src={img}
            style={ReactImgViewer.getTransform({zoom: idx === 1 ? zoomLevel : 1})}
          />
        </div>
      ))
    );

    return (
      <div className="riv_outer-container">
        <div
          className="riv_inner-container"
          onTouchStart={this.handleTouchStart}
          onTouchMove={this.handleTouchMove}
          onTouchEnd={this.handleTouchEnd}
          style={style}
          onTransitionEnd={this.handleTransitionEnd}
        >
          {imgs}
        </div>
      </div>
    );
  }
}

export default ReactImgViewer;
