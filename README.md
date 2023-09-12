# gitcm

`gitcm` is an opinionated git commits message helper.

## Usage

```bash
npx @gitcm/cli
```

## Installation

You can choose to install globally so that you can use the `gitcm` or `git-commit` commands. They are equivalent to `npx @gitcm/cli`.

```bash
npm install -g @gitcm/cli
```

## More Examples

For example, you can use the following command:

```bash
gitcm init "init commit"
```

Which will execute the following command:

```bash
git commit -m ":tada: init: init commit"
```

We provide an interactive cli tool.

```bash
$ gitcm
┌  @gitcm/cli - v0.1.4
│
●  Config file found in C:\Users\Jannchie\.config\gitcm\config.json
│
◇  What is the commit type? (required)
│  ✨ feat
│
◇  What is the commit scope? (optional)
│  test
│
◇  What is the commit body? (required)
│  this is a commit message
│
◇  Your commit command is ─────────────────────────────────────────╮
│                                                                   │
│  git commit -m ":sparkles: feat(test): this is a commit message"  │
│                                                                   │
├───────────────────────────────────────────────────────────────────╯
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

You can change the configuration by editing this file.

## License

MIT
