/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
                baseUrl: registration.baseUrl ? registration.baseUrl : "localhost",
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
