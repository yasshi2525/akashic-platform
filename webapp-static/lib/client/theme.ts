"use client";

import { createTheme, colors } from "@mui/material";

export const theme = createTheme({
    palette: {
        mode: "dark",
        primary: {
            main: colors.teal[500],
        },
        secondary: {
            main: colors.blue[500],
        },
        background: {
            default: colors.blueGrey[900],
            paper: colors.blueGrey[700],
        },
        text: {
            primary: colors.blueGrey[50],
            secondary: colors.blueGrey[200],
        },
    },
});
