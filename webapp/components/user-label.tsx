"use client";

import { Avatar, colors, Stack, Typography, useTheme } from "@mui/material";
import { User } from "@/lib/types";

function TextIcon({ name }: { name?: string }) {
    return (
        <Avatar
            sx={{
                bgcolor: colors.deepOrange[500],
            }}
        >
            {name ?? "ゲ"}
        </Avatar>
    );
}

function UserIcon({ user }: { user: User | null }) {
    if (!user) {
        return null;
    }
    if (!user.image) {
        if (user.authType !== "guest") {
            return <TextIcon name={user.name} />;
        } else {
            return <TextIcon />;
        }
    } else {
        return <Avatar src={user.image} alt={user.name} />;
    }
}

export function UserLabel({ user }: { user: User | null }) {
    const theme = useTheme();

    return (
        <Stack direction="row" gap={2} alignItems="center">
            <UserIcon user={user} />
            <Typography
                variant="body1"
                sx={{
                    color: theme.palette.text.secondary,
                    display: {
                        xs: "none",
                        sm: "inherit",
                    },
                }}
            >
                {user?.name}
            </Typography>
        </Stack>
    );
}
