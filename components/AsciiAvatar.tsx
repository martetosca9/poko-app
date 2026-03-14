type Props = {
    seed: string
    className?: string
    style?: React.CSSProperties
}

function hash(str: string): number {
    let h = 0
    for (let i = 0; i < str.length; i++) {
        h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
    }
    return Math.abs(h)
}

function pick<T>(arr: T[], n: number): T {
    return arr[n % arr.length]
}

const ANTENAS = [
    " ^ ^ ^ ",
    " * . * ",
    " ¤ ~ ¤ ",
    " | . | ",
    " / ^ \\ ",
    "  \\|/  ",
    " *.*.* ",
]

const OJOS = [
    "( @   @ )",
    "( o   o )",
    "( *   * )",
    "( ^   ^ )",
    "( ·   · )",
    "( 0   0 )",
    "( >   < )",
    "( =   = )",
]

const NARICES = [
    "  < . >  ",
    "  < - >  ",
    "  < v >  ",
    "  < ~ >  ",
    "  ( . )  ",
    "  { . }  ",
    "  < = >  ",
]

const BOCAS = [
    "  ~---~  ",
    "  -___-  ",
    "  =====  ",
    "  ~^^^~  ",
    "  ≈≈≈≈≈  ",
    "  -...-  ",
    "  ~vvv~  ",
]

const CONTORNOS_TOP = [
    " /-----\\ ",
    " .-----, ",
    " [-----] ",
    " {-----} ",
    " (-----) ",
]

const CONTORNOS_BOT = [
    " \\-----/ ",
    " '-----' ",
    " [_____] ",
    " {_____} ",
    " (_____) ",
]

export default function AsciiAvatar({ seed, className, style }: Props) {
    const h = hash(seed)

    const antena = pick(ANTENAS, h)
    const top = pick(CONTORNOS_TOP, h >> 3)
    const ojos = pick(OJOS, h >> 6)
    const nariz = pick(NARICES, h >> 9)
    const boca = pick(BOCAS, h >> 12)
    const bot = pick(CONTORNOS_BOT, h >> 15)

    const face = [antena, top, ojos, nariz, boca, bot].join("\n")

    return (
        <pre className={className ?? "text-[8px] leading-tight"} style={style}>
            {face}
        </pre>
    )
}