import { Microgrammar, Opt } from "@atomist/microgrammar";

const REGISTRY = {
  registry: /[a-z0-9]+(?:[._-][a-z0-9]+)*/,
  _path: "/",
  $consumeWhiteSpaceBetweenTokens: false,
};

const VersionGrammar = Microgrammar.fromString<{ version: string }>(
  ":${version}",
  {
    version: /[a-zA-Z0-9\._-]+/,
  },
);

/**
 * Microgrammar for a reference to a Docker image
 * @type {Microgrammar<DockerImage>}
 */
export const versionedDockerImageRefGrammar = Microgrammar.fromDefinitions<
  DockerImage
>({
  _registry: new Opt(REGISTRY),
  registry: (ctx: any) => (ctx._registry ? ctx._registry.registry : undefined),
  name: /[a-z0-9]+(?:[._-][a-z0-9]+)*/,
  _version: new Opt(VersionGrammar),
  version: (ctx: any) => (ctx._version ? ctx._version.version : undefined),
  $consumeWhiteSpaceBetweenTokens: false,
});

/**
 * Microgrammar for the parent image defined in the FROM clause
 * @type {Microgrammar<{parentImage: DockerImage}>}
 */
export const fromDockerImageGrammar = Microgrammar.fromDefinitions<{
  parentImage: DockerImage;
}>({
  _from: "FROM",
  parentImage: versionedDockerImageRefGrammar,
});

export interface DockerImage {
  registry?: string;

  name: string;

  version?: string;
}
