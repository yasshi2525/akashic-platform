"use client";

import { Alert, Container } from "@mui/material";
import { SignIn } from "./sign-in";

export function SignInAlert({ message }: { message: string }) {
    return (
        <Container
            maxWidth="md"
            sx={{
                mt: 4,
                display: "flex",
                flexFlow: "column",
                alignItems: "center",
                gap: 4,
            }}
        >
            <Alert variant="outlined" severity="error" sx={{ width: "100%" }}>
                {message}
            </Alert>
            <SignIn />
        </Container>
    );
}
