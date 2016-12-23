# Facets

> Facets widget is a component to display interactive query and facet results.

## Usage

The Facets Widget is available on Uncharted's private npm registry.

To use it as a jspm dependency, first install jspm:

	```
	npm install -g jspm
	```

Then configure the uncharted npm repository for jspm. Do NOT configure credentials when prompted:

	```
	jspm registry create uncharted jspm-npm
	npm registry: https://nexus.uncharted.software/repository/uncharted
	```

Now you can install it in your project:

	```
	jspm install npm:@uncharted/facets
	```

To consume it in your project, use:

  ```
  import Facets from '@uncharted/facets';
  ```

## Development

Install node.

Install bower and gulp-cli as global npm modules.

From root of project:

	```
	npm install
	bower install
	gulp
	```

### Using the development version

Facets auto-links via JSPM on build/watch. This means you can use your local linked copy in other projects for quick iteration. To do so, run this in your other project:

  ```
  jspm install --link npm:@uncharted/facets
  ```

This will connect that project to your local development version of facets. Be aware that this is version sensitive so if your local version of facets doesn't match the version being consumed by your project this may not have the desired effect.

To unlink the project and go back to the version from npm, run:

  ```
  jspm install --unlink npm:@uncharted/facets
  ```

JSPM remembers linkages so if you're unsure of what version your project is using, run the following and look at the output for npm:@uncharted/facets for linkage state:

  ```
  jspm inspect
  ```


## Run tests

In development mode, run `gulp tdd --debug` to run the tests in Chrome, and keep the browser open, re-running on changes.

To run the tests once and generate a coverage report, run `gulp test`.

## Run examples

From root of project:

	```
	npm start
	```

Browse to [http://localhost:3000](http://localhost:3000)


## Publish

Note: This process is manual for now. A future improvement will be to automate it via the build machine, for example, to have the build machine run the tests, and if the tests pass, tag and run npm publish.

As part of developing a feature or bugfix on a branch, when submitting it for a PR, bump up version number in `package.json` according to [semver](http://semver.org/).

After the PR is approved and merged to `master`, tag and publish based on version in `package.json`, for example (replace version number and message as appropriate):

	```
	git pull
	git checkout master
	git tag -a v0.2.0 -m "FLT-283 add append feature"
	git push origin v0.2.0
	npm publish
	```

Verify the publish succeeded by checking that the expected version of `@uncharted/facets` is available on [Uncharted's private npm registry](https://nexus.uncharted.software/#browse/browse/assets:npm).
