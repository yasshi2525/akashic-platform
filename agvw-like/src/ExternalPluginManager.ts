import { Trigger } from "@akashic/trigger";
import type { Game } from "@akashic/game-driver";
import type { MemoryQueueDataBus } from "@cross-border-bridge/memory-queue-data-bus";
import { FunctionTableMetadata } from "./ExternalPluginSignatureCaller";
import { GameContent } from "./GameContent";

export interface ExternalPlugin {
    name: string;
    implicit: boolean;
    untrustedSignature: FunctionTableMetadata;
    requires: string[] | null;
    scriptUrls: string[] | null;
    onregister: ((manager: ExternalPluginManager) => void) | null;
    onload: (
        game: Game,
        databus: MemoryQueueDataBus,
        content: GameContent,
    ) => void;
}

export class ExternalPluginManager {
    onRegister: Trigger<ExternalPlugin>;
    _externalPlugin: Record<string, ExternalPlugin>;
    _implicitPluginNames: string[];

    constructor() {
        this.onRegister = new Trigger();
        this._externalPlugin = {};
        this._implicitPluginNames = [];
    }

    register(plugin: ExternalPlugin) {
        this._externalPlugin[plugin.name] = plugin;
        if (plugin.implicit) {
            this._implicitPluginNames.push(plugin.name);
        }
        if (plugin.onregister) {
            plugin.onregister(this);
        }
        this.onRegister.fire(plugin);
    }

    find(pluginName: string): ExternalPlugin | undefined {
        return this._externalPlugin[pluginName];
    }

    implicitPluginNames() {
        return this._implicitPluginNames;
    }
}
