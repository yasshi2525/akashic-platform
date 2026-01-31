"use client";

import { useState } from "react";
import {
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { SignIn } from "./sign-in";

export function SignInDialog() {
    const [open, setOpen] = useState(false);

    function handleClick() {
        setOpen(true);
    }
    function handleClose() {
        setOpen(false);
    }
    return (
        <>
            <Button variant="contained" onClick={handleClick}>
                サインイン
            </Button>
            <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
                <DialogTitle
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                    }}
                >
                    サインイン
                    <IconButton aria-label="close" onClick={handleClose}>
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ pb: 3 }}>
                    <SignIn size="medium" />
                </DialogContent>
            </Dialog>
        </>
    );
}
