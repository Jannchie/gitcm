# gitcm

`gitcm` is an opinionated git commits message helper.

## Installation

```bash
npm install -g @gitcm/cli
```

## Usage

For example, you can use the following command:

```bash
gitcm init "init commit"
```

Which will execute the following command:

```bash
git commit -m ":tada: init: init commit"
```

## More Examples

We provide an interactive cli tool.

```bash
$ gitcm
✔ What is the commit type? (required)
feat

✔ What is the commit scope? (optional)
Enter commit scope

✔ What is the commit for? (required)
test

✔ Are you sure to execute this command? (git commit -m ":sparkles: feat: test")
Yes
```

You can also set the type, scope and body with command-line arguments:

```bash
# git commit -m ":sparkles: feat(test): test commit"
$ gitcm feat test "test commit" 

# git commit -m ":sparkles: feat: test commit"
$ gitcm feat "test commit" 
```

You can find help with the following command:

```bash
gitcm --help
```

## Configuration

When you use this command for the first time, it writes the configuration in `~/.config/gitcm/config.json`.

The default configuration is as follows:

```json
{
  "showIcon": true,
  "verbose": false,
  "data": {
    "feat": {
      "display": "feat",
      "emoji": ":sparkles:"
    },
    "chore": {
      "display": "chore",
      "emoji": ":wrench:"
    },
    "refactor": {
      "display": "refactor",
      "emoji": ":hammer:"
    },
    "fix": {
      "display": "fix",
      "emoji": ":adhesive_bandage:"
    },
    "hotfix": {
      "display": "hotfix",
      "emoji": ":ambulance:"
    },
    "docs": {
      "display": "docs",
      "emoji": ":books:"
    },
    "i18n": {
      "display": "i18n",
      "emoji": ":globe_with_meridians:"
    },
    "build": {
      "display": "build",
      "emoji": ":building_construction:"
    },
    "version": {
      "display": "version",
      "emoji": ":bookmark:"
    },
    "test": {
      "display": "test",
      "emoji": ":rotating_light:"
    },
    "ci": {
      "display": "ci",
      "emoji": ":construction_worker:"
    },
    "cd": {
      "display": "cd",
      "emoji": ":construction_worker:"
    },
    "workflow": {
      "display": "workflow",
      "emoji": ":construction_worker:"
    },
    "wip": {
      "display": "wip",
      "emoji": ":construction_worker:"
    },
    "init": {
      "display": "init",
      "emoji": ":tada:"
    },
    "style": {
      "display": "style",
      "emoji": ":art:"
    },
    "docker": {
      "display": "docker",
      "emoji": ":whale:"
    },
    "revert": {
      "display": "revert",
      "emoji": ":rewind:"
    },
    "config": {
      "display": "config",
      "emoji": ":wrench:"
    },
    "release": {
      "display": "release",
      "emoji": ":bookmark:"
    },
    "tag": {
      "display": "tag",
      "emoji": ":bookmark:"
    }
  }
}
```

You can change the configuration by editing this file.

## License

MIT
