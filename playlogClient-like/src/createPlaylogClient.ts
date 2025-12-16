import { PlaylogClient } from "./PlaylogClient";
import { PlaylogClientLike } from "./PlaylogClientLike";

export const createPlaylogClient = () =>
    new PlaylogClientLike() as PlaylogClient;
