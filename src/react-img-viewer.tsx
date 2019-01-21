import * as React from "react";
import "./index.css";

export interface IProps {
  visible: boolean;
  imgs: string[];
  prevSrc: string;
  mainSrc: string;
  nextSrc: string;
  onNext: () => void;
  onPrev: () => void;
}

interface IState {
  zoomLevel: number;
  offsetX: number;
  offsetY: number;
  isAnimating: boolean;
  keyIndex: number;
  nextKeyIndex: number;
}

const MIN_ZOOM_LEVEL = 1;
const MAX_ZOOM_LEVEL = 5;
enum Action { NONE, SWIPE, PINCH, MOVE }

class ReactImgViewer extends React.Component<IProps, IState> {
  public static defaultProps = {};

  public static getTransform({ x = 0, y = 0, zoom = 1 }) {
    return {
      transform: `translate(${x}px, ${y}px) scale(${zoom}, ${zoom})`,
    };
  }

  private isDragging: boolean = false;

  private startPosX: number;
  private startPosY: number;
  private startTime: number;

  private endPosX: number;
  private endPosY: number;
  private endTime: number;

  private currentAction: Action = Action.NONE;

  public constructor(props: IProps) {
    super(props);

    this.state = {
      zoomLevel: 0,
      offsetX: 0,
      offsetY: 0,
      isAnimating: false,
      keyIndex: 0,
      nextKeyIndex: 0,
    };
  }

  public getViewerRect = () => {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    };
  }

  public handleTouchStart = (e: any) => {
    const { isAnimating } = this.state;

    if (this.isDragging || isAnimating) {
      return;
    }
    this.isDragging = true;

    switch (e.touches.length) {
      case 1:
        this.handleMoveOrSwipe(e.touches[0]);
        break;
      case 2:
        break;
      default:
        break;
    }
  }

  public handleTouchMove = (e: any) => {
    const { isAnimating } = this.state;

    if (!this.isDragging || isAnimating) {
      return;
    }

    switch (this.currentAction) {
      case Action.SWIPE:
        this.handleSwipeMove(e.touches[0]);
        break;
      default:
        break;
    }
  }

  public handleTouchEnd = (e: any) => {
    const { isAnimating } = this.state;

    if (!this.isDragging || isAnimating) {
      return;
    }

    switch (this.currentAction) {
      case Action.SWIPE:
        this.handleSwipeEnd();
        break;
      default:
        break;
    }

    this.isDragging = false;
    this.currentAction = Action.NONE;
  }

  public handleMoveOrSwipe = (touch: any) => {
    if (this.state.zoomLevel <= MIN_ZOOM_LEVEL) {
      this.handleSwipeStart(touch);
    } else {
      this.handleMoveStart(touch);
    }
  }

  public handleSwipeStart = (touch: any) => {
    this.currentAction = Action.SWIPE;
    this.startPosX = touch.clientX;
    this.startPosY = touch.clientY;
    this.startTime = Date.now();
  }

  public handleSwipeMove = (touch: any) => {
    this.setState({
      offsetX: touch.clientX - this.startPosX,
    });

    this.endPosX = touch.clientX;
    this.endPosY = touch.clientY;
    this.endTime = Date.now();
  }

  public handleSwipeEnd = () => {
    const { keyIndex } = this.state;

    const diffX = this.endPosX - this.startPosX;
    const duration = Date.now() - this.startTime;
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

    this.startPosX = 0;
    this.startPosY = 0;
    this.endTime = 0;

    this.setState({
      isAnimating: true,
      offsetX: 0,
      nextKeyIndex,
    });
  }

  public handleMoveStart = (touch: any) => {
    this.currentAction = Action.MOVE;
  }

  public handleTransitionEnd = () => {
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

  public render() {
    const { prevSrc, mainSrc, nextSrc, visible } = this.props;
    const { offsetX, isAnimating, nextKeyIndex, keyIndex  }  = this.state;

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
          <img className="riv_img" src={img} />
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
