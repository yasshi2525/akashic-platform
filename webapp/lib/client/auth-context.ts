import { ActionDispatch, createContext } from "react";
import { User } from "@/lib/types";
import { AuthAction } from "./auth-action";

export const AuthContext = createContext<
    [User | null, ActionDispatch<[AuthAction]>] | null
>(null);
