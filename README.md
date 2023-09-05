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
      "emoji": ":sparkles:",
      "selectable": true
    },
    "chore": {
      "display": "chore",
      "emoji": ":wrench:",
      "selectable": true
    },
    "fix": {
      "display": "fix",
      "emoji": ":adhesive_bandage:",
      "selectable": true
    },
    "refactor": {
      "display": "refactor",
      "emoji": ":hammer:",
      "selectable": true
    },
    "style": {
      "display": "style",
      "emoji": ":art:",
      "selectable": true
    },
    "move": {
      "display": "move",
      "emoji": ":truck:",
      "selectable": true
    },
    "docs": {
      "display": "docs",
      "emoji": ":books:",
      "selectable": true
    },
    "wip": {
      "display": "wip",
      "emoji": ":construction:",
      "selectable": true
    },
    "init": {
      "display": "init",
      "emoji": ":tada:", 
      "selectable": true
    },
    "release": {
      "display": "release",
      "emoji": ":bookmark:",
      "selectable": true
    },
    "hotfix": {
      "display": "hotfix",
      "emoji": ":ambulance:",
      "selectable": false
    },
    "build": {
      "display": "build",
      "emoji": ":package:",
      "selectable": false
    },
    "i18n": {
      "display": "i18n",
      "emoji": ":globe_with_meridians:",
      "selectable": false
    },
    "test": {
      "display": "test",
      "emoji": ":rotating_light:",
      "selectable": false
    },
    "ci": {
      "display": "ci",
      "emoji": ":robot:",
      "selectable": false
    },
    "cd": {
      "display": "cd",
      "emoji": ":robot:",
      "selectable": false
    },
    "workflow": {
      "display": "workflow",
      "emoji": ":robot:",
      "selectable": false
    },
    "docker": {
      "display": "docker",
      "emoji": ":whale:",
      "selectable": false
    },
    "revert": {
      "display": "revert",
      "emoji": ":rewind:",
      "selectable": false
    },
    "config": {
      "display": "config",
      "emoji": ":wrench:",
      "selectable": false
    },
    "version": {
      "display": "version",
      "emoji": ":bookmark:",
      "selectable": false
    },
    "tag": {
      "display": "tag",
      "emoji": ":bookmark:",
      "selectable": false
    }
  }
}
```

You can change the configuration by editing this file.

## License

MIT
