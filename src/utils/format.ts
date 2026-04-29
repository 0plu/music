/** 将秒数转换为"分:秒"格式字符串，如185秒转为"03:05" */
export function convertDuration(duration: number): string {
    const minutes = Math.floor(duration / 60);
    const minutesText = minutes < 10 ? `0${minutes}` : minutes;
    const seconds = duration % 60;
    const secondsText = seconds < 10 ? `0${seconds}` : seconds;
    return `${minutesText}:${secondsText}`;
}
