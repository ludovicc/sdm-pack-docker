import {
    GoalInvocation,
    logger,
} from "@atomist/sdm";
import { SpawnedDeployment } from "@atomist/sdm-core";
import { DelimitedWriteProgressLogDecorator } from "@atomist/sdm/api-helper/log/DelimitedWriteProgressLogDecorator";
import { spawn } from "child_process";
import * as portfinder from "portfinder";

export interface DockerRunnerOptions {
    lowerPort: number;
    successPatterns: RegExp[];
    baseUrl: string;
}

export class DockerRunner {

    // Already allocated ports
    public readonly repoBranchToPort: { [repoAndBranch: string]: number } = {};

    // Keys are ports: values are containerIds
    private readonly portToContainer: { [port: number]: string } = {};

    constructor(private readonly options: DockerRunnerOptions) {}

    public async deployProject(goalInvocation: GoalInvocation): Promise<SpawnedDeployment> {
        const branch = goalInvocation.sdmGoal.branch;

        let port = this.repoBranchToPort[goalInvocation.id.repo + ":" + branch];
        if (!port) {
            port = await portfinder.getPortPromise({ /*host: this.options.baseUrl,*/ port: this.options.lowerPort });
            this.repoBranchToPort[goalInvocation.id.repo + ":" + branch] = port;
        }
        const existingContainer = this.portToContainer[port];
        if (!!existingContainer) {
            await stopAndRemoveContainer(existingContainer);
        } else {
            // Check we won't end with a crazy number of child processes
            const presentCount = Object.keys(this.portToContainer)
                .filter(n => typeof n === "number")
                .length;
            if (presentCount >= 5) {
                throw new Error(`Unable to deploy project at ${goalInvocation.id} as limit of 5 has been reached`);
            }
        }

        const name = `${goalInvocation.id.repo}_${branch}`;
        const childProcess = spawn("docker",
            [
                "run",
                `-p${port}:8080`,
                `--name=${name}`,
                goalInvocation.sdmGoal.push.after.image.imageName,
            ],
            {});
        if (!childProcess.pid) {
            throw new Error("Fatal error deploying using Docker");
        }
        const deployment = {
            childProcess,
            endpoint: `${this.options.baseUrl}:${port}`,
        };

        this.portToContainer[port] = name;

        const newLineDelimitedLog = new DelimitedWriteProgressLogDecorator(goalInvocation.progressLog, "\n");
        childProcess.stdout.on("data", what => newLineDelimitedLog.write(what.toString()));
        childProcess.stderr.on("data", what => newLineDelimitedLog.write(what.toString()));
        let stdout = "";
        let stderr = "";

        return new Promise<SpawnedDeployment>((resolve, reject) => {
            childProcess.stdout.addListener("data", what => {
                if (!!what) {
                    stdout += what.toString();
                }
                if (this.options.successPatterns.some(successPattern => successPattern.test(stdout))) {
                    resolve(deployment);
                }
            });
            childProcess.stderr.addListener("data", what => {
                if (!!what) {
                    stderr += what.toString();
                }
            });
            childProcess.addListener("exit", async () => {
                if (this.options.successPatterns.some(successPattern => successPattern.test(stdout))) {
                    resolve(deployment);
                } else {
                    logger.error("Maven deployment failure vvvvvvvvvvvvvvvvvvvvvv");
                    logger.error("stdout:\n%s\nstderr:\n%s\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^", stdout, stderr);
                    reject(new Error("Maven deployment failure"));
                }
            });
            childProcess.addListener("error", reject);
        });
    }
}

function stopAndRemoveContainer(existingContainer: string) {
    spawn("docker",
        [
            "rm",
            "-f",
            existingContainer,
        ]);
}
