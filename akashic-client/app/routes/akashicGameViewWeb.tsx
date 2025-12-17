import { useEffect, useRef } from "react";
import { AkashicGameView } from "@yasshi2525/agvw-like";

export default function AkashicGameViewWeb() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) {
            return;
        }
        const agv = new AkashicGameView({
            container: containerRef.current,
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
            trustedChildOrigin: /.*/,
        });
        return () => {
            agv.destroy();
        };
    }, []);

    return <div ref={containerRef}></div>;
}
