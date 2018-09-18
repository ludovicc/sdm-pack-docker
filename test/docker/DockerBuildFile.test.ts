//import { Microgrammar } from "@atomist/microgrammar";
import * as assert from "power-assert";
import {
  fromDockerImageGrammar,
  versionedDockerImageRefGrammar,
} from "../../lib/docker/DockerBuildFile";

describe("DockerBuildFile", () => {
  describe("dockerImageGrammar", () => {
    it("should parse references to a versioned Docker image", () => {
      const m = versionedDockerImageRefGrammar.firstMatch("reg/test:v1.0");
      assert(!!m);
      assert(m.registry === "reg");
      assert(m.name === "test");
      assert(m.version === "v1.0");
    });
  });

  describe("fromDockerImageGrammar", () => {
    it("should parse FROM clauses", () => {
      const FROM = "FROM reg/test:v1.0";
      const m = fromDockerImageGrammar.firstMatch(FROM);
      assert(!!m);
      assert.equal(m.parentImage.registry, "reg");
      assert.equal(m.parentImage.name, "test");
      assert.equal(m.parentImage.version, "v1.0");
    });
/*
    it("should allow updates of the image version", () => {
      const FROM = "FROM reg/test:v1.0";
      const m = fromDockerImageGrammar.firstMatch(FROM);
      assert(!!m);
      const updater = Microgrammar.updatableMatch(m, FROM);
      updater.parentImage.version = "v1.1";
      assert.equal(updater.newContent(), "FROM reg/test:v1.1");
    });
*/
  });
});
