import { MouseEvent } from "react";
import { Button, Link, Stack, Typography, useTheme } from "@mui/material";
import { OpenInNew } from "@mui/icons-material";

const URL_REGEX = /(https?:\/\/[^\s\u3000-\u9fff\uff00-\uffef<>'"]+)/g;

export function GameDescription({
    description,
    gameId,
    expanded,
    onToggle,
}: {
    description: string;
    gameId: number;
    expanded: boolean;
    onToggle: (e: MouseEvent, id: number) => void;
}) {
    const theme = useTheme();
    const needsToggle = description.includes("\n") || description.length > 120;

    return (
        <Stack spacing={0.5}>
            <Typography
                variant="body2"
                sx={{
                    color: theme.palette.text.secondary,
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                    ...(expanded
                        ? { whiteSpace: "pre-wrap" }
                        : {
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                          }),
                }}
            >
                {renderTextWithLinks(description)}
            </Typography>
            {needsToggle && (
                <Button
                    size="small"
                    onClick={(e) => onToggle(e, gameId)}
                    sx={{
                        alignSelf: "flex-start",
                        p: 0,
                        minWidth: 0,
                        color: theme.palette.primary.light,
                    }}
                >
                    {expanded ? "折りたたむ" : "もっと見る"}
                </Button>
            )}
        </Stack>
    );
}

export function renderTextWithLinks(text: string) {
    const parts = text.split(URL_REGEX);
    return parts.map((part, i) =>
        i % 2 === 1 ? (
            <Link
                key={i}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                sx={{
                    wordBreak: "break-all",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.25,
                }}
            >
                {part}
                <OpenInNew sx={{ fontSize: "0.9em", flexShrink: 0 }} />
            </Link>
        ) : (
            part
        ),
    );
}
