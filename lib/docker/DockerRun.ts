import {
    DefaultGoalNameGenerator,
    ExecuteGoal,
    ExecuteGoalResult,
    FulfillableGoalWithRegistrations,
    GoalInvocation,
    ImplementationRegistration,
    IndependentOfEnvironment,
} from "@atomist/sdm";
import {
    DockerRunner,
    DockerRunnerOptions,
} from "./DockerRunner";

export interface DockerRunRegistration extends Partial<ImplementationRegistration> {
    lowerPort?: number;
    successPatterns: RegExp[];
    baseUrl?: string;
    sourcePort: number;
}

export class DockerRun extends FulfillableGoalWithRegistrations<DockerRunRegistration> {
    constructor(uniqueName: string = DefaultGoalNameGenerator.generateName("docker-run")) {
        super({
            uniqueName,
            displayName: "docker run",
            environment: IndependentOfEnvironment,
            workingDescription: "Running docker run",
            completedDescription: "Docker run successful",
            failedDescription: "Docker run failed",
            isolated: true,
        });
    }

    public with(registration: DockerRunRegistration): this {
        this.addFulfillment({
            goalExecutor: executeDockerRun( {
                successPatterns: registration.successPatterns,
                lowerPort: registration.lowerPort ? registration.lowerPort : 9090,
                baseUrl: registration.baseUrl ? registration.baseUrl : "http://localhost",
                sourcePort: registration.sourcePort,
            }),
            name: DefaultGoalNameGenerator.generateName("docker-runner"),
        });
        return this;
    }
}

export function executeDockerRun(options: DockerRunnerOptions): ExecuteGoal {
    const deployer = new DockerRunner(options);
    return async (goalInvocation: GoalInvocation): Promise<ExecuteGoalResult> => {
        return deployer.deployProject(goalInvocation).then(deployment => {
                return {
                    code: 0,
                    targetUrl: deployment.endpoint,
                };
            },
        ).catch(reason => {
            return {
                code: 1,
                message: reason,
            };
        });
    };
}
