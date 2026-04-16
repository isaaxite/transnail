import signale, { Signale } from "signale";

export default class Hint {
  private genOpt(type: signale.DefaultMethods, label: string) {
    return {
      types: { [type]: { label } }
    } as any as signale.SignaleOptions;
  }

  warn(text: string) {
    signale.warn(text);
  }

  warnList({ main, subs }: {
    main: { label: string, text: string };
    subs: string[];
  }) {
    let signale = new Signale(this.genOpt('warn', main.label));
    signale.warn(main.text);

    if (!subs?.length) {
      return;
    }

    signale = new Signale(this.genOpt('warn', ''));
    for (const text of subs.slice(0, -1)) {
      signale.warn(`  ├── ${text}`);
    }
    signale.warn(`  └── ${subs.slice(-1)[0]}`);
  }

  error(text: string) {
    signale.error(text);
  }

  success(text: string, label: string) {
    if (label) {
      const signale = new Signale(this.genOpt('success', label));
      return signale.success(text);
    }

    signale.success(text);
  }

  note(text: string, label: string) {
    if (label) {
      const signale = new Signale(this.genOpt('note', label));
      return signale.note(text);
    }

    signale.note(text);
  }

  copied(text: string) {
    const signale = new Signale(this.genOpt('success', 'copied'));
    signale.success(text);
  }

  moved(text: string) {
    const signale = new Signale(this.genOpt('success', 'moved'));
    signale.success(text);
  }

  fatal(text: string, label: string) {
    if (label) {
      const signale = new Signale(this.genOpt('fatal', label));
      return signale.fatal(text);
    }
    signale.fatal(text);
  }
}
