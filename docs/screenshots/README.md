# 스크린샷

루트 [README](../../README.md) 의 「시연 영상」과 「화면」이 이 폴더를 가리킵니다.
같은 이름으로 덮어쓰면 그대로 반영됩니다.

| 파일            | 쓰이는 곳                               |
| --------------- | --------------------------------------- |
| `cover.png`     | 시연 영상 썸네일 (누르면 영상으로 이동) |
| `result.png`    | 닮은 품종 판정 결과                     |
| `game.png`      | 다마고치 (돌보기 · 스탯 · 성장)         |
| `chat.png`      | 대화                                    |
| `photo-gen.png` | 기념 사진 생성                          |
| `album.png`     | 앨범                                    |
| `ending.png`    | 노년기 엔딩                             |

시연 영상: https://drive.google.com/file/d/1WI4S5U381Li2evgK2KVrGdU-tJPgHBmD/view

## 새로 찍을 때

`npm start` 로 띄운 뒤 화면을 찍습니다. 성장 단계나 엔딩처럼 시간이 걸리는 화면은
기다리지 말고 시연 도구로 건너뛰세요
([DEVELOPMENT.md 의 시연 도구](../../DEVELOPMENT.md#시연-도구)).
**게임 화면을 찍을 때는 시연 도구를 접어두세요** — 펼친 채로 찍으면 화면 절반이
개발 UI가 됩니다.

**세로 비율로 맞춰주세요.** 표에 세 장씩 나란히 놓기 때문에, 가로로 긴 이미지가
섞이면 줄 높이가 들쭉날쭉해집니다. 지금 파일들은 **9:16 (608×1080)** 과
세로형(약 954×1080)이 섞여 있습니다.

브라우저 창을 찍었다면 가운데를 9:16으로 잘라 쓰면 됩니다. PowerShell 로 자를 때:

```powershell
Add-Type -AssemblyName System.Drawing
$path = (Resolve-Path "docs\screenshots\game.png").Path
$src  = [System.Drawing.Image]::FromFile($path)
$newW = [int][math]::Round($src.Height * 9 / 16)
$x    = [int](($src.Width - $newW) / 2)
$bmp  = New-Object System.Drawing.Bitmap($newW, $src.Height)
$g    = [System.Drawing.Graphics]::FromImage($bmp)
$g.DrawImage($src, (New-Object System.Drawing.Rectangle(0,0,$newW,$src.Height)),
                   (New-Object System.Drawing.Rectangle($x,0,$newW,$src.Height)),
                   [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose(); $src.Dispose()
$bmp.Save("$path.tmp", [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
Move-Item "$path.tmp" $path -Force
```

> 파일 이름은 **영문으로** 지어주세요. 한글 이름도 GitHub 에서 열리기는 하지만
> 링크에서 인코딩되어 읽기 어려워집니다.
