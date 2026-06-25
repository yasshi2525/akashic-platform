"use client";

import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    useTheme,
} from "@mui/material";

export function PlayLeaveDialog({
    open,
    isClosing,
    closeError,
    onCloseRoomAndLeave,
    onLeaveWithoutClosing,
    onCancel,
}: {
    open: boolean;
    isClosing: boolean;
    closeError?: string;
    onCloseRoomAndLeave: () => void;
    onLeaveWithoutClosing: () => void;
    onCancel: () => void;
}) {
    const theme = useTheme();
    return (
        <Dialog
            open={open}
            onClose={onCancel}
            aria-labelledby="leave-dialog-title"
            aria-describedby="leave-dialog-description"
        >
            <DialogTitle id="leave-dialog-title">
                部屋を閉じますか？
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="leave-dialog-description">
                    今この部屋にいる人は他に誰もいません。部屋を閉じますか？
                </DialogContentText>
                {closeError && (
                    <Alert variant="outlined" severity="error" sx={{ mt: 1 }}>
                        {closeError}
                    </Alert>
                )}
                <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
                    <Button
                        variant="contained"
                        loading={isClosing}
                        disabled={isClosing}
                        onClick={onCloseRoomAndLeave}
                        sx={{
                            backgroundColor: theme.palette.error.dark,
                        }}
                    >
                        部屋を閉じて移動
                    </Button>
                    <Button
                        variant="outlined"
                        loading={isClosing}
                        disabled={isClosing}
                        onClick={onLeaveWithoutClosing}
                        sx={{
                            borderColor: theme.palette.primary.light,
                            color: theme.palette.primary.light,
                        }}
                    >
                        閉じずに移動
                    </Button>
                    <Button
                        variant="outlined"
                        color="inherit"
                        disabled={isClosing}
                        onClick={onCancel}
                    >
                        キャンセル
                    </Button>
                </DialogActions>
            </DialogContent>
        </Dialog>
    );
}
