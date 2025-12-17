import { HorizontalAlignment, VerticalAlignment } from "./akashic-gameview";

export interface LayoutParameterObject {
    naturalWidth: number;
    naturalHeight: number;
    outerWidth: number;
    outerHeight: number;
    /**
     * {@link HorizontalAlignment}
     */
    horizontalAlignment: number;
    /**
     * {@link VerticalAlignment}
     */
    verticalAlignment: number;
}

const calcX = (params: LayoutParameterObject, width: number) => {
    switch (params.horizontalAlignment) {
        case HorizontalAlignment.Left:
            return 0;
        case HorizontalAlignment.Center:
            return (params.outerWidth - width) / 2;
        case HorizontalAlignment.Right:
            return params.outerWidth - width;
        default:
            return 0;
    }
};

const calcY = (params: LayoutParameterObject, height: number) => {
    switch (params.verticalAlignment) {
        case VerticalAlignment.Top:
            return 0;
        case VerticalAlignment.Center:
            return (params.outerHeight - height) / 2;
        case VerticalAlignment.Bottom:
            return params.outerHeight - height;
        default:
            return 0;
    }
};

export const calcNoneLayout = (params: LayoutParameterObject) => {
    const width = params.naturalWidth;
    const height = params.naturalHeight;
    return { x: calcX(params, width), y: calcY(params, height), width, height };
};

export const calcFillLayout = (params: LayoutParameterObject) => {
    return { x: 0, y: 0, width: params.outerWidth, height: params.outerHeight };
};

export const calcAspectFitLayout = (params: LayoutParameterObject) => {
    const scaleX = params.outerWidth / params.naturalWidth;
    const scaleY = params.outerHeight / params.naturalHeight;
    const scale = Math.min(scaleX, scaleY);
    const width = params.naturalWidth * scale;
    const height = params.naturalHeight * scale;
    return { x: calcX(params, width), y: calcY(params, height), width, height };
};
