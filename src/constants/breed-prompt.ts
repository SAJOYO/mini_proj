// 이 파일은 생성됩니다. 직접 고치지 마세요.
//
//   원본        20-breed-prompts/*-prompts.md
//   다시 만들기 npm run prompts:build
//
// 프롬프트를 바꾸려면 마크다운을 고치고 위 명령을 다시 돌리세요.
// 여기를 고치면 다음 빌드에서 그대로 지워집니다.

import type { BreedId } from '@/constants/pet';
import type { StageId } from '@/lib/game';

/** 그림체. 25개 문서 100개 단계가 전부 같은 한 줄을 씁니다. */
export const BREED_ART_STYLE = '35mm film-look vector composited in.';

/** 시선 규칙. 정면 응시로 굳는 것을 막습니다. 역시 100개 단계 공통입니다. */
export const BREED_GAZE =
  'GAZE - unforced and natural. The person is either looking down at the dog with a soft expression or glancing toward the camera. The dog is either looking up at the person or giving the camera a relaxed, candid glance with its head tilted off-axis. The two eyelines must make sense together. If either one looks at the camera it reads as a casual snapshot glance, never a stiff, symmetrical, front-facing portrait stare.';

/** 한 견종의 한 단계. */
export type BreedStagePrompt = {
  /** "a Beagle puppy" — 프롬프트의 THE DOG: 뒤에 그대로 들어갑니다. */
  subject: string;
  /** 자세와 인물과의 접촉. 단계마다 다른 포즈가 배정돼 있습니다. */
  pose: string;
  /** 그 나이대의 생김새. 머리 비율·귀·털·눈까지. */
  look: string;
  /** 색 지정 한 줄. 단계마다 조금씩 바랩니다. */
  palette: string;
};

export type BreedPromptSet = {
  /** 다른 견종과 절대 섞이면 안 되는 고정 특징. 프롬프트 끝에 다시 붙여 강조합니다. */
  anchors: string[];
  stages: Record<StageId, BreedStagePrompt>;
};

export const BREED_PROMPTS: Record<BreedId, BreedPromptSet> = {
  neutral: {
    anchors: [
      'Deliberately GENERIC - a friendly mixed-breed dog that must not read as any one recognisable breed',
      'SEMI-DROP ears set at about forty-five degrees: not standing erect and not hanging flat, the tips folding softly outward',
      'A medium muzzle of ordinary length, a medium build of ordinary proportion - nothing exaggerated in either direction',
      'A plain SOLID warm ochre coat, short and smooth, with no markings, no saddle and no patches, and a medium tail carried in a relaxed easy curve',
    ],
    stages: {
      baby: {
        subject: 'a mixed-breed puppy',
        pose: "Sitting close beside the person with its chin dropped onto their forearm, the full weight of the head resting on them. Near-profile view. The person's other hand comes over to cradle the side of its face, their own face in frame and tipped toward the dog. The dog's eyes are half-closed, drifting up toward them. Heavy, affectionate, unposed.",
        look: 'Oversized round head (1.3x body width) with a short blunt muzzle. SEMI-DROP ears already at their halfway angle, soft and loose, the tips folding outward. Short smooth puppy coat lying flat everywhere, no markings anywhere. Plump round belly, no waist, short thick legs and oversized paws. Huge round dark eyes #2E2820 with a white highlight dot upper-right, a small dark oval nose, tiny closed mouth. A pale muzzle, chest and paws against the plain ochre coat, and a short tail curling in a loose relaxed arc. Innocent, ordinary, uncoordinated.',
        palette:
          'Coat warm ochre #DDBB5C; muzzle, chest, paws pale cream #E8CE83; ears and shading #A8871F; nose, eyes, mouth #2E2820; one uniform thick warm brown outline #6B5622.',
      },
      teen: {
        subject: 'a mixed-breed adolescent',
        pose: "Front end dropped low to the ground, chest and elbows down, rump high in the air, mid-bounce and about to spring. Three-quarter view, body angled away from the camera. The person crouches opposite, hands out, mid-laugh, their face in frame and turned toward the dog. The dog's head is up and cocked to one side, locked on them. Springy, coiled, unposed.",
        look: 'Head (1.2x body width) with the muzzle settling into its ordinary adult length. SEMI-DROP ears now at their full size, held at about forty-five degrees with the tips folding outward. The body has gone leggy and light, the chest not yet dropped, an obvious tuck at the waist. Short smooth coat lying flat, still completely unmarked. Large bright round eyes #2E2820 with a white highlight dot upper-right, dark oval nose, mouth open in a happy grin. Plain ochre throughout with a pale muzzle, chest and paws, and a medium tail carried up in an easy curve. Alert, cheerful, distractible.',
        palette:
          'Coat warm ochre #C9A227; muzzle, chest, paws pale cream #E8CE83; ears and shading #A8871F; nose, eyes, mouth #2E2820; one uniform thick warm brown outline #6B5622.',
      },
      young: {
        subject: 'a mixed-breed dog',
        pose: "Mid-stride walking alongside the person, near-profile view, one front paw lifted mid-step, body clearly moving through the frame. The person walks beside it in step, one hand hanging down near its head, their face in frame and tipped down toward the dog. The dog's head is turned up and sideways toward them. Loose, in motion, unposed.",
        look: 'Rounded skull (1.2x body width) with a medium muzzle of ordinary length and a dark oval nose. SEMI-DROP ears set at about forty-five degrees, the tips folding softly outward - neither erect nor hanging flat. The body is at its peak, balanced and square, as tall as it is long, built on straight legs of ordinary length. Short smooth coat lying tight everywhere with no feathering. Round dark eyes #2E2820 with a white highlight dot upper-right, evenly set, mouth slightly open in a cheerful grin. A plain SOLID warm ochre coat with no markings at all, a pale muzzle, chest and paws, and a medium tail carried in a relaxed easy curve. Steady, friendly, unremarkable.',
        palette:
          'Coat warm ochre #C9A227; muzzle, chest, paws pale cream #E8CE83; ears and shading #A8871F; nose, eyes, mouth #2E2820; one uniform thick warm brown outline #6B5622.',
      },
      elder: {
        subject: 'an elderly mixed-breed dog',
        pose: "Sitting pressed against the person's leg, the whole body leaning into them for balance, head tipped all the way back to look up at their face. Three-quarter view, body angled away from the camera. The person looks down at it, their face in frame, one hand resting on the dog's chest. The two eyelines meet. Trusting, settled, unposed.",
        look: 'Head (1.15x body width), broader and softer through the muzzle. The SEMI-DROP ears sit lower and thinner, folding further outward. The balanced body has thickened and settled, the topline soft, the shoulders dropped. The short coat has dulled and thinned against the frame. A clear silver-cream frosting across the muzzle, the brows and around the eyes, fading into the ochre. Smaller gentler round eyes #2E2820 with a dim white highlight dot upper-right, outer corners tilting downward, a soft crease beneath each eye. Dark oval nose, mouth closed and restful. Tail carried low with the curl mostly gone. Serene, dignified.',
        palette:
          'Coat muted ochre #B79A45; muzzle frosting, brows, chest silver-cream #EDE3CB; ears and shading faded #96792A; nose, eyes, mouth #2E2820; one uniform thick warm brown outline #6B5622.',
      },
    },
  },
  shiba: {
    anchors: [
      'Small ERECT triangular ears, thick and tilted slightly FORWARD',
      'A thick plush tail curled up in a firm RING over the back',
      'URAJIRO: cream-white markings on the cheeks, the sides of the muzzle, the throat, the chest and the whole underside, with a clean boundary against the red',
      'Compact square body, straight strong legs, thick short double coat with no feathering; small deep-set triangular eyes with a confident, slightly smug expression',
    ],
    stages: {
      baby: {
        subject: 'a Shiba Inu puppy',
        pose: "Lying belly-down and completely melted into the floor, hind legs kicked straight out behind in a loose frog-leg splay, front legs stretched forward. The chin rests directly on the ground between the front paws. The person sits right beside the dog, one hand resting on its back, their face turned down toward it and fully in frame. The dog's head is laid slightly off-center, eyes looking softly up toward them. Boneless, unposed.",
        look: 'Oversized round head (1.3x body width) with a very short blunt muzzle - much rounder and softer than the adult fox face. Small ERECT triangular ears, thick and rounded at the tips, only just standing upright. Thick soft puppy double coat standing out all over, no feathering. Plump round belly, no waist, short thick legs and oversized paws. Huge round dark eyes #2B221D with a white highlight dot upper-right, small dark oval nose, tiny closed mouth. URAJIRO cream on the cheeks, muzzle, throat, chest and underside. Short thick tail beginning to curl over the back. Innocent, sturdy, uncoordinated.',
        palette:
          'Coat red #C97F45; urajiro cheeks, muzzle, chest, underside cream #F1E3CE; ears and back deeper #A66233; nose, eyes, mouth #2B221D; one uniform thick warm brown outline #6A452A.',
      },
      teen: {
        subject: 'a Shiba Inu adolescent',
        pose: "Sitting shoulder to shoulder with the person, both turned to look out at the same view off to one side. Seen from a three-quarter FRONT angle, so both faces stay visible in profile - the dog's head in clean profile with its ears and coat catching the light, the person's face lit from the side. The person's arm rests along the dog's back. Quiet, companionable, unposed.",
        look: 'Head (1.2x body width) with the muzzle lengthening into the adult fox shape. Small ERECT triangular ears now firmly upright and tilted forward, looking a touch large. The body has stretched leggy and lean, the chest still shallow, the waist obvious. The coat is mid-change - patchy and uneven as the adult double coat pushes through, some tufts standing out at the shoulders and hips. Bright deep-set triangular eyes #2B221D with a white highlight dot upper-right, dark oval nose, mouth slightly open in a light grin. URAJIRO cream on cheeks, muzzle, throat, chest and underside. Tail curling up over the back, the ring not yet tight. Alert, aloof, mischievous.',
        palette:
          'Coat red #C97F45; urajiro cheeks, muzzle, chest, underside cream #F1E3CE; ears and back deeper #A66233; nose, eyes, mouth #2B221D; one uniform thick warm brown outline #6A452A.',
      },
      young: {
        subject: 'a Shiba Inu',
        pose: "Sitting pressed against the person's leg, the whole body leaning into them for balance, head tipped all the way back to look up at their face. Three-quarter view, body angled away from the camera. The person looks down at it, their face in frame, one hand resting on the dog's chest. The two eyelines meet. Trusting, settled, unposed.",
        look: 'Broad wedge-shaped head (1.2x body width) with full round cheeks and a moderate tapering fox muzzle. Small ERECT triangular ears, thick and tilted slightly forward. The body is at its peak - compact and square, deep-chested, well-muscled, standing on straight strong legs. Thick short double coat standing off the body, harsh on top and dense beneath, with no feathering anywhere. Small deep-set triangular eyes #2B221D with a white highlight dot upper-right, giving a confident, faintly smug expression. Dark oval nose, mouth slightly open in a composed grin. Crisp URAJIRO cream on the cheeks, muzzle sides, throat, chest and underside with a clean boundary against the red. A thick plush tail curled up in a firm RING over the back. Compact, proud, self-possessed.',
        palette:
          'Coat red #C97F45; urajiro cheeks, muzzle, chest, underside cream #F1E3CE; ears and back deeper #A66233; nose, eyes, mouth #2B221D; one uniform thick warm brown outline #6A452A.',
      },
      elder: {
        subject: 'an elderly Shiba Inu',
        pose: "Mid-stride walking alongside the person, near-profile view, one front paw lifted mid-step, body clearly moving through the frame at an unhurried pace. The person walks beside it in step, one hand hanging down near its head, their face in frame and tipped down toward the dog. The dog's head is turned up and sideways toward them. Loose, slow, unposed.",
        look: 'Broad head (1.15x body width), heavier and softer through the cheeks. ERECT triangular ears still standing but set a little lower and thinner. The square body has thickened, the topline settling, the legs planted solid. The double coat has dulled and thinned, standing off the body less than it did. A clear silver-white frosting across the muzzle, the brows and around the eyes, blending into the urajiro cream so the whole face reads pale. Smaller gentler triangular eyes #2B221D with a dim white highlight dot upper-right, outer corners tilting downward, a soft crease beneath each eye. Dark oval nose, mouth closed and restful. Tail still curled over the back but looser and carried lower. Serene, dignified.',
        palette:
          'Coat muted red #BC7743; urajiro and muzzle frosting silver-cream #F0E7D8; ears faded #9A5C32; nose, eyes, mouth #2B221D; one uniform thick warm brown outline #6A452A.',
      },
    },
  },
  retriever: {
    anchors: [
      'VISIBLE drop ears  (NOT "no visible ears" = Bichon)',
      'Smooth flowing / feathered outline (NOT "scalloped" = Bichon, NOT "tight curls" = Poodle)',
      'Long plumed tail  (NOT "cotton-puff tail", NOT "pom-pom")',
    ],
    stages: {
      baby: {
        subject: 'a Golden Retriever puppy',
        pose: "Held up against the person's chest, scooped under the front legs, the body hanging soft and relaxed against them. The person's face, arms and upper body are all in frame, their cheek close to the puppy's head. The puppy's head rests back against their shoulder, its face right beside theirs, giving the camera a soft sleepy glance. Limp, content, unposed.",
        look: 'Oversized rounded head (1.3x body width), broad round skull with a very short blunt muzzle. VISIBLE EARS: soft floppy drop ears hanging against the cheeks, rounded tips, oversized for the head. Smooth unbroken outline, short plush fuzzy puppy coat with NO feathering yet. Plump round belly, no waist, comically oversized paws. Huge wide-set round dark brown eyes #4A3728 with a white highlight dot upper-right, small rounded muzzle in pale cream, small dark oval nose, tiny closed mouth. Very short neck, soft rounded shoulders, small cream chest patch, short thick legs, short stubby tail with no plume yet. Innocent, curious, uncoordinated.',
        palette:
          'Coat pale golden #F0C88A; muzzle, chest, paws cream #F4DCB0; ears slightly deeper gold #CE9550; nose, eyes, mouth #4A3728; one uniform thick warm brown outline #7A5636.',
      },
      teen: {
        subject: 'a Golden Retriever adolescent',
        pose: "Standing on its hind legs with both front paws planted on the person's knee, stretching upward, body fully extended and slightly off-balance. The person bends toward it, both hands reaching in, their face in frame and laughing down at it. The dog's head is tilted up and back, gaze locked on their face. Eager, pushy, unposed.",
        look: 'Rounded head (1.2x body width) on a gawky lanky body, long legs slightly too long for the frame, narrow chest, visible waist. VISIBLE EARS: soft drop ears looking too big for the head. Smooth flowing outline, coat mid-length and glossy, feathering just coming in - thin wispy uneven fringes on the back of the legs and the underside of the tail. Large bright wide-set dark brown eyes #4A3728 with a white highlight dot upper-right, lengthening muzzle, dark oval nose, mouth slightly open in an easy grin. Longer neck, cream chest ruff filling in, long tail with a half-grown plume. Alert, energetic, mischievous.',
        palette:
          'Coat golden #E5B168; muzzle, chest, feathering cream #F4DCB0; ears deeper gold #CE9550; nose, eyes, mouth #4A3728; one uniform thick warm brown outline #7A5636.',
      },
      young: {
        subject: 'a Golden Retriever',
        pose: "Sitting shoulder to shoulder with the person, both turned to look out at the same view off to one side. Seen from a three-quarter FRONT angle, so both faces stay visible in profile - the dog's head in clean profile with its ears and coat catching the light, the person's face lit from the side. The person's arm rests along the dog's back. Quiet, companionable, unposed.",
        look: 'Broad rounded head (1.2x body width) with a wide friendly skull, gentle stop, and a strong medium-length muzzle. VISIBLE EARS: soft drop ears set level with the eyes, hanging in a smooth curve against the cheeks with light feathering at the edges. Smooth flowing outline, coat at its peak - dense, glossy, mid-length, with full wavy feathering on the chest, the back of all four legs and the underside of the tail. Deep-chested athletic body, straight back. Large wide-set warm dark brown eyes #4A3728 with a white highlight dot upper-right, dark oval nose, mouth slightly open in a relaxed friendly smile. Broad cream chest ruff, long thick tail with a full plume of feathering. Calm, warm, trusting.',
        palette:
          'Coat golden #E5B168; muzzle, chest, feathering cream #F4DCB0; ears deeper gold #CE9550; nose, eyes, mouth #4A3728; one uniform thick warm brown outline #7A5636.',
      },
      elder: {
        subject: 'an elderly Golden Retriever',
        pose: "Sitting pressed against the person's leg, the whole body leaning into them for balance, head tipped all the way back to look up at their face. Three-quarter view, body angled away from the camera. The person looks down at it, their face in frame, one hand resting on the dog's chest. The two eyelines meet. Trusting, settled, unposed.",
        look: 'Broad rounded head (1.15x body width), slightly heavier and blockier than in its prime. VISIBLE EARS: soft drop ears hanging low, their feathering thinner and wispier at the edges. Smooth outline, coat duller and less dense, feathering on the chest, legs and tail noticeably sparser and flatter. Broader thicker body, lower shoulders. A distinct WHITE-SILVER MASK across the muzzle, around the eyes and over the eyebrows, fading gradually into the golden coat. Smaller gentler dark brown eyes #4A3728 with a dim white highlight dot upper-right, outer corners tilting downward, a soft crease beneath each eye. Dark oval nose, mouth closed and restful. Long tail with a thinner plume. Serene, dignified.',
        palette:
          'Coat muted golden #DBAA6B; muzzle mask, brows, chest, feathering silver-cream #EFE4CF; ears faded gold #C79A5C; nose, eyes, mouth #4A3728; one uniform thick warm brown outline #7A5636.',
      },
    },
  },
  dachshund: {
    anchors: [
      'EXTREMELY LONG, LOW body carried on very short legs - the length of the back is the whole breed. Roughly twice as long as it is tall.',
      'A long, straight, gently tapering muzzle on a narrow head',
      'Long soft DROP ears hanging flat beside the cheeks, set high and rounded at the tips',
      'A deep keel chest jutting forward, a straight tail carried level with the back, SHORT SMOOTH coat with no feathering',
    ],
    stages: {
      baby: {
        subject: 'a Dachshund puppy',
        pose: 'Rolled over onto its back, all four legs folded up in the air, spine twisted, head upside-down and tipped back. The person crouches over it, one hand on its belly, face in frame and laughing down at it. Mouth open in an upside-down grin, eyes rolled back toward the camera in a happy upside-down glance. Ridiculous, undignified, unposed.',
        look: 'Oversized rounded head (1.3x body width) with a short muzzle that has only just begun to lengthen. Long soft DROP ears, oversized for the head, hanging flat and swinging loose. The body is already noticeably LONG and LOW, a soft sausage on tiny paddle legs and comically large paws. Short smooth coat lying flat everywhere. Plump round belly. Huge round dark eyes #2A211C with a white highlight dot upper-right, small dark oval nose, tiny closed mouth. Cream chest and underside, short straight tail. Innocent, floppy, uncoordinated.',
        palette:
          'Coat red #B5703E; chest and underside cream #E5C39A; ears and shading #97552C; nose, eyes, mouth #2A211C; one uniform thick warm brown outline #5C3A22.',
      },
      teen: {
        subject: 'a Dachshund adolescent',
        pose: "Mid-stride walking alongside the person, near-profile view, one front paw lifted mid-step, body clearly moving through the frame. The person walks beside it in step, one hand hanging down near its head, their face in frame and tipped down toward the dog. The dog's head is turned up and sideways toward them. Loose, in motion, unposed.",
        look: 'Narrowing head (1.2x body width) with the muzzle lengthening into its adult taper. Long DROP ears now reaching past the jaw, swinging with each step. The body has stretched out to its full comic length while the chest is still shallow, so the dog reads as a lanky tube on short legs that are only just thickening. Short smooth glossy coat lying flat everywhere. Large bright round eyes #2A211C with a white highlight dot upper-right, dark oval nose, mouth slightly open in an easy grin. Cream chest and underside, straight tail carried level and swinging. Alert, busy, mischievous.',
        palette:
          'Coat red #B5703E; chest and underside cream #E5C39A; ears and shading #97552C; nose, eyes, mouth #2A211C; one uniform thick warm brown outline #5C3A22.',
      },
      young: {
        subject: 'a Dachshund',
        pose: "Lying belly-down and completely melted into the deck, hind legs kicked straight out behind in a loose frog-leg splay, front legs stretched forward. The chin rests directly on the boards between the front paws. The person sits right beside the dog, one hand resting on its back, their face turned down toward it and fully in frame. The dog's head is laid slightly off-center, eyes looking softly up toward them. Boneless, unposed.",
        look: 'Long narrow head (1.2x body width) with a straight, gently tapering muzzle and a confident expression. Long soft DROP ears set high, hanging flat and rounded against the cheeks, framing the face. The body is at its peak - extremely long and low, roughly twice as long as it is tall, with a deep keel chest jutting forward between short, well-muscled legs and a smooth level topline running the whole way to the tail. Short smooth glossy coat lying tight everywhere, no feathering. Bright round eyes #2A211C with a white highlight dot upper-right, dark oval nose, small closed mouth. Cream chest and underside, straight tail carried level with the back. Bold, comic, dignified about it.',
        palette:
          'Coat red #B5703E; chest and underside cream #E5C39A; ears and shading #97552C; nose, eyes, mouth #2A211C; one uniform thick warm brown outline #5C3A22.',
      },
      elder: {
        subject: 'an elderly Dachshund',
        pose: "Sitting pressed against the person's leg, the whole body leaning into them for balance, head tipped all the way back to look up at their face. Three-quarter view, body angled away from the camera. The person looks down at it, their face in frame, one hand resting on the dog's chest. The two eyelines meet. Trusting, settled, unposed.",
        look: 'Long narrow head (1.15x body width), the muzzle broader and softer than in its prime. Long DROP ears hanging low and thin. The long body has thickened and settled, the topline dipping a little behind the shoulders, the short legs planted wide and solid. The smooth coat has dulled and thinned, showing the frame beneath. A clear silver-white frosting across the muzzle, the brows and around the eyes, fading into the red. Smaller gentler round eyes #2A211C with a dim white highlight dot upper-right, outer corners tilting downward, a soft crease beneath each eye. Dark oval nose, mouth closed and restful. Straight tail carried low. Serene, dignified.',
        palette:
          'Coat muted red #A96B42; muzzle frosting, brows, chest silver-cream #EFE1CD; ears faded #8D5430; nose, eyes, mouth #2A211C; one uniform thick warm brown outline #5C3A22.',
      },
    },
  },
  poodle: {
    anchors: [
      'Tightly coiled curls / springy ringlets (NOT "scalloped" = Bichon, NOT "feathering" = Golden Retriever)',
      'Round TOPKNOT of curls on the head',
      'Long curly drop ears framing the face',
      'Slim leggy build, tail ending in a round POM-POM',
    ],
    stages: {
      baby: {
        subject: 'a Toy Poodle puppy',
        pose: "Curled up drowsing in the person's lap, body folded into a tight comma, head tucked against their forearm, one paw hanging loose over their knee. The person sits upright, NOT hunched over the dog, and only tips their chin down a little so their face stays open to the camera. The dog's eyes are heavy-lidded and half open, drifting up toward them. Sleepy, heavy, unposed.",
        look: 'Oversized rounded head (1.3x body width) with a very short blunt muzzle and a soft baby-round skull. VISIBLE EARS: short floppy drop ears hanging against the cheeks, covered in loose baby waves. Coat is soft crimped puppy fluff, gentle loose waves not yet tight curls. Small barely-formed topknot of fluff. Plump round belly, oversized paws. Large wide-set round dark eyes #3E2A20, small cream muzzle, small dark oval nose, tiny closed mouth. Very short neck, soft rounded shoulders, short stubby legs, short tail with a tiny tuft at the tip. Innocent, drowsy, uncoordinated.',
        palette:
          'Coat pale apricot #E4B187; muzzle, chest, paws cream #EFCBA6; ears deeper apricot #C98F63; nose, eyes, mouth #3E2A20; one uniform thick warm brown outline #6B4630.',
      },
      teen: {
        subject: 'a Toy Poodle adolescent',
        pose: 'Rolled over onto its back on the grass, all four legs folded up in the air, spine twisted, head upside-down and tipped back. The person crouches over it, one hand on its belly, face in frame and laughing down at it. Mouth open in an upside-down grin, eyes rolled back toward the camera in a happy upside-down glance. Ridiculous, undignified, unposed.',
        look: 'Rounded head (1.2x body width) with a lengthening, gently tapering muzzle, on a lanky body with comically long stilt-like legs. VISIBLE EARS: drop ears grown longer, their curls half-formed and wispy. Coat mid-transition - soft puppy waves on the body giving way to tighter springy curls at the shoulders and legs, so the outline reads unevenly bumpy. A loose round topknot forming on the head. Large bright wide-set dark eyes #3E2A20 with a white highlight dot upper-right, cream muzzle, dark oval nose. Longer neck, cream chest curls filling in, slim tail with a small developing pom at the tip. Alert, energetic, mischievous.',
        palette:
          'Coat apricot #D89A6A; muzzle, chest cream #EFCBA6; ears deeper apricot #B87A4E; nose, eyes, mouth #3E2A20; one uniform thick warm brown outline #6B4630.',
      },
      young: {
        subject: 'a Toy Poodle',
        pose: "Lying belly-down and completely melted into the floor, hind legs kicked straight out behind in a loose frog-leg splay, front legs stretched forward. The chin rests directly on the rug between the front paws. The person sits on the floor right beside the dog, one hand resting on its back, their face turned down toward it and fully in frame. The dog's head is laid slightly off-center, eyes looking softly up from floor level toward them. Boneless, unposed.",
        look: 'Neat rounded head (1.2x body width) crowned by a full, perfectly round TOPKNOT of dense curls, with a slim, gently tapering muzzle. VISIBLE EARS: long drop ears hanging low on either side of the face like two curly curtains, framing the cheeks. Coat at its peak - dense, even, tightly coiled curls all over, an outline of small springy ringlets that reads distinctly curly rather than fluffy. Fine-boned, leggy, elegant build. Large wide-set dark eyes #3E2A20 with a white highlight dot upper-right, dark oval nose, tiny closed mouth. Cream curls at the chest, slim tail ending in a full round POM-POM of curls. Calm, soft, quietly happy.',
        palette:
          'Coat apricot #D89A6A; muzzle, chest cream #EFCBA6; ears deeper apricot #B87A4E; nose, eyes, mouth #3E2A20; one uniform thick warm brown outline #6B4630.',
      },
      elder: {
        subject: 'an elderly Toy Poodle',
        pose: "Held up against the person's chest, scooped under the front legs, the body hanging soft and relaxed against them. The person's face, arms and upper body are all in frame, their cheek close to the dog's head. The dog's head rests back against their shoulder, its face right beside theirs, giving the camera a soft tired glance. Limp, content, unposed.",
        look: 'Rounded head (1.15x body width) with a slim muzzle. VISIBLE EARS: long drop ears hanging low, their curls loosened and thinned at the edges. Coat softened and sparser - the tight ringlets have relaxed into looser, flatter waves, the outline less springy. The topknot has gone flat and low. A clear WHITE-SILVER frosting across the muzzle, around the eyes, over the eyebrows and down the toes, fading gradually into the faded apricot coat. Smaller gentler dark eyes #3E2A20 with a dim white highlight dot upper-right, outer corners tilting downward, a soft crease beneath each eye. Dark oval nose, mouth closed and restful. Thin legs, slim tail with a smaller, thinner pom at the tip. Serene, dignified.',
        palette:
          'Coat faded apricot #CFA588; muzzle frosting, brows, chest silver-cream #EDE2D4; ears muted apricot #B08A70; nose, eyes, mouth #3E2A20; one uniform thick warm brown outline #6B4630.',
      },
    },
  },
  beagle: {
    anchors: [
      'TRICOLOUR pattern: a black saddle across the back, a tan head and legs, and white on the muzzle, throat, chest, feet and tail tip',
      'Very long soft DROP ears set LOW, hanging well past the jaw with rounded tips, framing the cheeks',
      'A square blunt muzzle with a large dark nose, and big round soft pleading eyes',
      'A short dense hard coat and a straight tail carried UP with a clean WHITE TIP',
    ],
    stages: {
      baby: {
        subject: 'a Beagle puppy',
        pose: "Standing on its hind legs with both front paws planted on the person's knee, stretching upward, body fully extended and slightly off-balance. The person bends toward it, both hands reaching in, their face in frame and laughing down at it. The dog's head is tilted up and back, gaze locked on their face. Eager, pushy, unposed.",
        look: 'Oversized round head (1.3x body width) with a short blunt muzzle. The DROP ears are already enormous for the head, set low and hanging soft and loose past the jaw. Short dense coat lying flat everywhere. Plump round belly, no waist, short thick legs and oversized white paws. Huge round dark pleading eyes #241F1B with a white highlight dot upper-right, a large dark oval nose, tiny closed mouth. Full TRICOLOUR already set - a black saddle over the back, tan head and legs, white muzzle, throat, chest, feet, and a short tail carried up with a white tip. Innocent, hopeful, uncoordinated.',
        palette:
          'Saddle #3B322B; head and legs tan #C08A56; muzzle, chest, feet, tail tip white #F3ECE0; nose, eyes, mouth #241F1B; one uniform thick warm brown outline #5A4634.',
      },
      teen: {
        subject: 'a Beagle adolescent',
        pose: "Front end dropped low to the ground, chest and elbows down, rump high in the air, mid-bounce and about to spring. Three-quarter view, body angled away from the camera. The person crouches opposite, hands out, mid-laugh, their face in frame and turned toward the dog. The dog's head is up and cocked to one side, locked on them. Springy, coiled, unposed.",
        look: 'Head (1.2x body width) with the muzzle squaring off into its adult shape. The long DROP ears now reach past the jaw and swing loose with every bounce. The body has gone leggy and light, the chest not yet dropped, an obvious tuck at the waist. Short dense glossy coat lying flat. Large bright round eyes #241F1B with a white highlight dot upper-right, big dark nose already working the air, mouth open in a happy grin. Black saddle, tan head and legs, white muzzle, chest, feet, and a straight tail carried high with a bright white tip. Alert, distractible, mischievous.',
        palette:
          'Saddle #3B322B; head and legs tan #C08A56; muzzle, chest, feet, tail tip white #F3ECE0; nose, eyes, mouth #241F1B; one uniform thick warm brown outline #5A4634.',
      },
      young: {
        subject: 'a Beagle',
        pose: "Mid-stride walking alongside the person, near-profile view, one front paw lifted mid-step, body clearly moving through the frame. The person walks beside it in step, one hand hanging down near its head, their face in frame and tipped down toward the dog. The dog's head is turned up and sideways toward them. Loose, in motion, unposed.",
        look: 'Slightly domed skull (1.2x body width) with a square blunt muzzle and a large dark nose. Very long soft DROP ears set LOW, hanging well past the jaw with rounded tips, framing the cheeks. The body is at its peak - compact, solid and slightly longer than tall, deep through the chest, built on straight sturdy legs. Short dense hard coat lying tight everywhere with no feathering. Big round soft brown eyes #241F1B with a white highlight dot upper-right, wide-set and pleading. Mouth slightly open in a cheerful grin. Crisp TRICOLOUR - black saddle across the back, tan head and legs, white muzzle, throat, chest and feet - and a straight tail carried UP with a clean WHITE TIP. Sturdy, merry, nose always working.',
        palette:
          'Saddle #3B322B; head and legs tan #C08A56; muzzle, chest, feet, tail tip white #F3ECE0; nose, eyes, mouth #241F1B; one uniform thick warm brown outline #5A4634.',
      },
      elder: {
        subject: 'an elderly Beagle',
        pose: "Lying belly-down and completely melted into the boards, hind legs kicked straight out behind in a loose frog-leg splay, front legs stretched forward. The chin rests directly on the ground between the front paws. The person sits right beside the dog, one hand resting on its back, their face turned down toward it and fully in frame. The dog's head is laid slightly off-center, eyes looking softly up toward them. Boneless, unposed.",
        look: 'Head (1.15x body width), broader and softer through the muzzle. The long DROP ears hang low and thin, spreading out where they touch the ground. The compact body has thickened and settled heavy and low, the topline soft, the shoulders dropped. The short coat has dulled and thinned, and the black saddle has faded toward a soft charcoal. A clear WHITE-SILVER MASK across the muzzle, around the eyes and over the eyebrows, running into the white of the face so the whole front reads pale. Smaller gentler round eyes #241F1B with a dim white highlight dot upper-right, outer corners tilting downward, a soft crease beneath each eye. Large dark nose, mouth closed and restful. Tail carried low, the white tip still bright. Serene, dignified.',
        palette:
          'Saddle faded charcoal #4B423A; head and legs muted tan #B8875C; mask, muzzle, chest, feet silver-white #F1EADD; nose, eyes, mouth #241F1B; one uniform thick warm brown outline #5A4634.',
      },
    },
  },
  shihtzu: {
    anchors: [
      'FLAT pushed-in face: a very short broad muzzle, a deep stop, and a slightly undershot chin - the muzzle barely projects at all',
      'Very large, round, wide-set dark eyes looking straight out of a flat face',
      'Long straight flowing coat parted down the spine, hanging past the body (NOT curly = Poodle, NOT scalloped = Bichon)',
      'Drop ears buried in the long side coat, plumed tail carried up and over the back',
    ],
    stages: {
      baby: {
        subject: 'a Shih Tzu puppy',
        pose: 'Rolled over onto its back, all four legs folded up in the air, spine twisted, head upside-down and tipped back. The person crouches over it, one hand on its belly, face in frame and laughing down at it. Mouth open in an upside-down grin, eyes rolled back toward the camera in a happy upside-down glance. Ridiculous, undignified, unposed.',
        look: 'Oversized round head (1.3x body width) with an extremely FLAT face - the muzzle is barely there, a soft squashed button under the eyes. Coat still short, soft and downy, no parting yet. Drop ears small and low, hidden under soft baby fringe. Plump round belly, no waist, tiny stubby legs. Enormous round wide-set dark eyes #2B2522 with a white highlight dot upper-right, dominating the flat face, a small flat black nose sitting high between them, tiny mouth. Very short neck, white blaze up the muzzle and a white chest patch, short tail with a small feather curling over the back. Innocent, comical, uncoordinated.',
        palette:
          'Coat gold #DBAE72; blaze, chest, paws white #F7F1E6; back and ears deeper gold #BE8F55; nose, eyes, mouth #2B2522; one uniform thick warm brown outline #6E5540.',
      },
      teen: {
        subject: 'a Shih Tzu adolescent',
        pose: "Lying belly-down and completely melted into the grass, hind legs kicked straight out behind in a loose frog-leg splay, front legs stretched forward. The chin rests directly on the ground between the front paws. The person sits right beside the dog, one hand resting on its back, their face turned down toward it and fully in frame. The dog's head is laid slightly off-center, eyes looking softly up toward them. Boneless, unposed.",
        look: 'Round head (1.2x body width) with the flat pushed-in face fully formed, short broad muzzle and a slightly undershot chin. The coat is growing out unevenly - a shaggy fringe flopping over the eyes, longer strands beginning to hang at the flanks, the spine parting only half set. Sturdy little body, legs still visible under the coat. Large round wide-set dark eyes #2B2522 with a white highlight dot upper-right, small flat black nose, mouth slightly open in a cheerful grin. Drop ears half buried in the growing side hair, tail with a half-grown plume curled over the back. Alert, goofy, mischievous.',
        palette:
          'Coat gold #DBAE72; blaze, chest, paws white #F7F1E6; back and ears deeper gold #BE8F55; nose, eyes, mouth #2B2522; one uniform thick warm brown outline #6E5540.',
      },
      young: {
        subject: 'a Shih Tzu',
        pose: "Curled up drowsing in the person's lap, body folded into a tight comma, head tucked against their forearm, one paw hanging loose over their knee. The person sits upright, NOT hunched over the dog, and only tips their chin down a little so their face stays open to the camera. The dog's eyes are heavy-lidded and half open, drifting up toward them. Sleepy, heavy, unposed.",
        look: 'Round head (1.2x body width), the face flat and open - very short broad muzzle, deep stop, chin slightly undershot. The coat is at its peak: long, heavy, perfectly straight hair parted cleanly down the spine and falling in two smooth sheets past the body, with a soft topknot of hair gathered on the crown. Drop ears completely buried in the side coat. Very large round wide-set dark eyes #2B2522 with a white highlight dot upper-right, small flat black nose, small closed mouth. Short sturdy legs hidden under the hanging coat, plumed tail carried up and arched over the back. Calm, regal, unbothered.',
        palette:
          'Coat gold #DBAE72; blaze, chest, paws white #F7F1E6; back and ears deeper gold #BE8F55; nose, eyes, mouth #2B2522; one uniform thick warm brown outline #6E5540.',
      },
      elder: {
        subject: 'an elderly Shih Tzu',
        pose: "Sitting pressed against the person's leg, the whole body leaning into them for balance, head tipped all the way back to look up at their face. Three-quarter view, body angled away from the camera. The person looks down at it, their face in frame, one hand resting on the dog's chest. The two eyelines meet. Trusting, settled, unposed.",
        look: 'Round head (1.15x body width) with the same flat face, now a little broader and softer. The coat has thinned and shortened, hanging closer to the body with wispier ends, the spine parting less crisp. A clear silver-white frosting across the muzzle, the brows and around the eyes, fading into the gold. Smaller gentler round eyes #2B2522 with a dim white highlight dot upper-right, outer corners tilting downward, a soft crease beneath each eye. Small flat black nose, mouth closed and restful. Broader body sitting low, short thick legs, tail plume thinner and carried lower. Serene, dignified.',
        palette:
          'Coat muted gold #CFA46C; muzzle frosting, brows, chest silver-white #F2EADC; back and ears faded #B0854F; nose, eyes, mouth #2B2522; one uniform thick warm brown outline #6E5540.',
      },
    },
  },
  maltese: {
    anchors: [
      'Long, perfectly STRAIGHT silky hair with a centre part down the back (NOT curly = Poodle, NOT scalloped = Bichon)',
      'Drop ears buried under the long side hair, shape only hinted',
      'Plumed tail carried arched over the back',
      'Tiny coal-black button nose and large round dark eyes on a small round head',
    ],
    stages: {
      baby: {
        subject: 'a Maltese puppy',
        pose: "Held up against the person's chest, scooped under the front legs, the body hanging soft and relaxed against them. The person's face, arms and upper body are all in frame, their cheek close to the puppy's head. The puppy's head rests back against their shoulder, its face right beside theirs, giving the camera a soft sleepy glance. Limp, content, unposed.",
        look: 'Oversized round head (1.3x body width) with a very short blunt muzzle. Hair still short and soft - baby fluff, perfectly straight but not yet long, no parting yet. Drop ears small and low, softened under a light fringe. Plump round belly, no waist, tiny stubby legs. Huge round dark eyes #2E2A28 with a white highlight dot upper-right, taking up much of the face, a tiny coal-black button nose, tiny closed mouth. Very short neck, small soft chest fluff, short tail with a small feather at the tip. Innocent, curious, uncoordinated.',
        palette:
          'Coat pure white #FBFAF7; shading and parting #ECE7DD; nose, eyes, mouth #2E2A28; one uniform thick warm grey outline #8A8378.',
      },
      teen: {
        subject: 'a Maltese adolescent',
        pose: "Front end dropped low to the ground, chest and elbows down, rump high in the air, mid-bounce and about to spring. Three-quarter view, body angled away from the camera. The person crouches opposite, hands out, mid-laugh, their face in frame and turned toward the dog. The dog's head is up and cocked to one side, locked on them. Springy, coiled, unposed.",
        look: 'Round head (1.2x body width) on a leggy, lightly built body. The silky straight hair is lengthening unevenly - a ragged fringe falling over the eyes, longer strands starting to hang at the sides, the centre part only half established. Drop ears half hidden under the growing side hair. Large bright round dark eyes #2E2A28 with a white highlight dot upper-right, tiny coal-black button nose, small closed mouth. Long thin legs with light fringing at the back, tail with a half-grown plume carried up over the back. Alert, energetic, mischievous.',
        palette:
          'Coat pure white #FBFAF7; shading and parting #ECE7DD; nose, eyes, mouth #2E2A28; one uniform thick warm grey outline #8A8378.',
      },
      young: {
        subject: 'a Maltese',
        pose: "Sitting close beside the person with its chin dropped onto their forearm, the full weight of the head resting on them. Near-profile view. The person's other hand comes over to cradle the side of its face, their own face in frame and turned down toward it. The dog's eyes are half-closed, drifting up toward them. Heavy, affectionate, unposed.",
        look: 'Small round head (1.2x body width) with a short muzzle. The coat is at its peak - long, heavy, perfectly straight silk falling in an unbroken curtain from a clean centre part along the spine, hanging past the elbows and skimming the ground, swaying as one sheet rather than breaking into curls or waves. Drop ears buried in the side hair, their shape only hinted. Large round dark eyes #2E2A28 with a white highlight dot upper-right under a neat fringe, tiny coal-black button nose, small closed mouth. Fine short legs hidden under the hanging hair, plumed tail carried arched over the back. Calm, dainty, trusting.',
        palette:
          'Coat pure white #FBFAF7; shading and parting #ECE7DD; nose, eyes, mouth #2E2A28; one uniform thick warm grey outline #8A8378.',
      },
      elder: {
        subject: 'an elderly Maltese',
        pose: "Curled up drowsing in the person's lap, body folded into a tight comma, head tucked against their forearm, one paw hanging loose over their knee. The person sits upright, NOT hunched over the dog, and only tips their chin down a little so their face stays open to the camera. The dog's eyes are heavy-lidded and half open, drifting up toward them. Sleepy, heavy, unposed.",
        look: 'Round head (1.15x body width) with a short muzzle. The coat has thinned and softened - still straight, but finer, lighter and shorter at the ends, the centre part less crisp, the whole silhouette settling closer to the body. A faintly yellowed aged ivory tint around the muzzle, the eyes and the ear fringes, fading into the white. Smaller gentler round eyes #2E2A28 with a dim white highlight dot upper-right, outer corners tilting downward, a soft crease beneath each eye. Tiny black nose, small closed mouth. Short legs, tail plume thinner and carried lower. Serene, dignified.',
        palette:
          'Coat pure white #FBFAF7; shading and parting #ECE7DD; nose, eyes, mouth #2E2A28; one uniform thick warm grey outline #8A8378.',
      },
    },
  },
  corgi: {
    anchors: [
      'LONG LOW body on very short sturdy legs, but heavy-boned and barrel-chested, not slender (a Dachshund is longer and finer)',
      'Oversized ERECT ears, wide at the base and ROUNDED at the tips, standing straight up',
      'Fox-like face with a white blaze running up the muzzle between the eyes',
      'A big round fluffy rump with a short bobtail; thick medium double coat with a pale cream underside',
    ],
    stages: {
      baby: {
        subject: 'a Pembroke Welsh Corgi puppy',
        pose: "Standing on its hind legs with both front paws planted on the person's knee, stretching upward, body fully extended and slightly off-balance. The person bends toward it, both hands reaching in, their face in frame and laughing down at it. The dog's head is tilted up and back, gaze locked on their face. Eager, pushy, unposed.",
        look: 'Oversized rounded head (1.3x body width) with a short blunt fox muzzle. Ears large, soft and ROUNDED, still flopping over rather than standing upright - only just starting to lift. Body already long and low, a round barrel on stubby paddle legs with oversized paws. Thick soft puppy double coat standing out all over. Huge round dark eyes #2C2420 with a white highlight dot upper-right, small dark oval nose, tiny closed mouth. A white blaze up the muzzle, white chest and paws, big round fluffy rump with a tiny bobtail. Innocent, roly-poly, uncoordinated.',
        palette:
          'Coat red #C98B4E; blaze, chest, paws, underside white #F5EDE0; ears and shading #A96C36; nose, eyes, mouth #2C2420; one uniform thick warm brown outline #6B4A2E.',
      },
      teen: {
        subject: 'a Pembroke Welsh Corgi adolescent',
        pose: "Front end dropped low to the ground, chest and elbows down, rump high in the air, mid-bounce and about to spring. Three-quarter view, body angled away from the camera. The person crouches opposite, hands out, mid-laugh, their face in frame and turned toward the dog. The dog's head is up and cocked to one side, locked on them. Springy, coiled, unposed.",
        look: 'Rounded head (1.2x body width) with the fox muzzle lengthening. The ears have shot up - now fully ERECT, wide at the base, rounded at the tips and looking far too big for the head. The body has stretched longer while the chest is still shallow, so the dog reads as a lanky low tube, the legs suddenly obvious. Coat mid-length and slightly uneven as the adult double coat comes in. Large bright round eyes #2C2420 with a white highlight dot upper-right, dark oval nose, mouth open in a wide easy grin. White blaze, white chest and paws, round fluffy rump with a bobtail. Alert, bossy, mischievous.',
        palette:
          'Coat red #C98B4E; blaze, chest, paws, underside white #F5EDE0; ears and shading #A96C36; nose, eyes, mouth #2C2420; one uniform thick warm brown outline #6B4A2E.',
      },
      young: {
        subject: 'a Pembroke Welsh Corgi',
        pose: "Mid-stride walking alongside the person, near-profile view, one front paw lifted mid-step, body clearly moving through the frame. The person walks beside it in step, one hand hanging down near its head, their face in frame and tipped down toward the dog. The dog's head is turned up and sideways toward them. Loose, in motion, unposed.",
        look: 'Fox-like head (1.2x body width) with a moderate tapering muzzle and a permanently cheerful expression. Oversized ERECT ears, wide at the base and cleanly ROUNDED at the tips, standing straight up. The body is at its peak - long, low, heavy-boned and barrel-chested on short sturdy legs, deep through the ribs, with a big round fluffy rump behind. Thick even double coat with a slight ruff at the neck and a pale cream underside. Bright round eyes #2C2420 with a white highlight dot upper-right, dark oval nose, mouth open in a relaxed grin. Crisp white blaze up the muzzle, white chest, collar and paws, short bobtail. Sturdy, cheerful, unstoppable.',
        palette:
          'Coat red #C98B4E; blaze, chest, paws, underside white #F5EDE0; ears and shading #A96C36; nose, eyes, mouth #2C2420; one uniform thick warm brown outline #6B4A2E.',
      },
      elder: {
        subject: 'an elderly Pembroke Welsh Corgi',
        pose: "Lying belly-down and completely melted into the boards, hind legs kicked straight out behind in a loose frog-leg splay, front legs stretched forward. The chin rests directly on the ground between the front paws. The person sits right beside the dog, one hand resting on its back, their face turned down toward it and fully in frame. The dog's head is laid slightly off-center, eyes looking softly up toward them. Boneless, unposed.",
        look: 'Broad fox head (1.15x body width), heavier and softer than in its prime. ERECT ears still standing but set a little lower and softer at the rounded tips. The long low body has thickened and settled, the topline dipping behind the shoulders. The double coat has dulled and thinned, lying flatter, the rump less full and round, pooling softly where it presses against the ground. A clear silver-white frosting across the muzzle, the brows and around the eyes, blending into the white blaze. Smaller gentler round eyes #2C2420 with a dim white highlight dot upper-right, outer corners tilting downward, a soft crease beneath each eye. Dark oval nose, mouth closed and restful. Serene, dignified.',
        palette:
          'Coat muted red #BC8149; blaze, muzzle frosting, chest silver-white #F2EBDE; ears faded #9C6534; nose, eyes, mouth #2C2420; one uniform thick warm brown outline #6B4A2E.',
      },
    },
  },
  chihuahua: {
    anchors: [
      'APPLE-DOME skull: a high, round, domed forehead that bulges out above a very short pointed muzzle',
      'Oversized ERECT ears, set wide apart and flaring outward, huge in proportion to the head',
      'Very large round eyes, set wide and low on the face',
      'Tiny delicate body with fine slender legs and a SHORT SMOOTH coat (no fluff, no curls, no feathering)',
    ],
    stages: {
      baby: {
        subject: 'a Chihuahua puppy',
        pose: "Held up against the person's chest, scooped under the front legs, the body hanging soft and relaxed against them. The person's face, arms and upper body are all in frame, their cheek close to the puppy's head. The puppy's head rests back against their shoulder, its face right beside theirs, giving the camera a soft sleepy glance. Limp, content, unposed.",
        look: 'Enormous APPLE-DOME head (1.35x body width) on a very tiny body - the domed forehead bulges high and round above a minute pointed muzzle. Ears large and soft, not yet fully upright, tipping outward at the sides. Short smooth coat with no fluff anywhere. Round belly, no waist, delicate matchstick legs and tiny paws. Huge round eyes #2A2320 with a white highlight dot upper-right, set wide and low, taking over the face. Tiny black nose, small closed mouth. Very short neck, cream chest patch, thin short tail. Fragile, wide-eyed, uncoordinated.',
        palette:
          'Coat fawn #D6A874; chest, muzzle, paws cream #F0DCC0; ears and shading #BE8E5C; nose, eyes, mouth #2A2320; one uniform thick warm brown outline #6B5236.',
      },
      teen: {
        subject: 'a Chihuahua adolescent',
        pose: 'Rolled over onto its back, all four legs folded up in the air, spine twisted, head upside-down and tipped back. The person crouches over it, one hand on its belly, face in frame and laughing down at it. Mouth open in an upside-down grin, eyes rolled back toward the camera in a happy upside-down glance. Ridiculous, undignified, unposed.',
        look: 'APPLE-DOME head (1.25x body width) with the ears now fully ERECT, enormous, flaring wide to the sides and looking far too big for the head. Short pointed muzzle, tiny black nose. Slim leggy body, ribs lightly visible, short smooth glossy coat lying flat everywhere. Large bright round eyes #2A2320 with a white highlight dot upper-right, set wide and low, mouth open in a small cheeky grin. Fine slender legs, a thin tapering tail flicked up. Alert, jumpy, mischievous.',
        palette:
          'Coat fawn #D6A874; chest, muzzle, paws cream #F0DCC0; ears and shading #BE8E5C; nose, eyes, mouth #2A2320; one uniform thick warm brown outline #6B5236.',
      },
      young: {
        subject: 'a Chihuahua',
        pose: "Standing on its hind legs with both front paws planted on the person's knee, stretching upward, body fully extended and slightly off-balance. The person bends toward it, both hands reaching in, their face in frame and laughing down at it. The dog's head is tilted up and back, gaze locked on their face. Eager, pushy, unposed.",
        look: 'APPLE-DOME head (1.2x body width) at its most defined - a high round forehead dropping sharply to a short pointed muzzle. Oversized ERECT ears standing tall and flaring wide, thin enough to catch the light. Compact, finely built body with a level back and a tucked waist, short smooth glossy coat lying tight everywhere with no fluff or feathering. Large round eyes #2A2320 with a white highlight dot upper-right, set wide and low, bold and bright. Small black nose, small closed mouth. Fine slender legs, a thin tapering tail carried up in a light curve. Tiny, cocky, self-important.',
        palette:
          'Coat fawn #D6A874; chest, muzzle, paws cream #F0DCC0; ears and shading #BE8E5C; nose, eyes, mouth #2A2320; one uniform thick warm brown outline #6B5236.',
      },
      elder: {
        subject: 'an elderly Chihuahua',
        pose: "Curled up drowsing in the person's lap, body folded into a tight comma, head tucked against their forearm, one paw hanging loose over their knee. The person sits upright, NOT hunched over the dog, and only tips their chin down a little so their face stays open to the camera. The dog's eyes are heavy-lidded and half open, drifting up toward them. Sleepy, heavy, unposed.",
        look: 'APPLE-DOME head (1.15x body width), the dome a little softer. The ERECT ears are still large but tip slightly outward and sit lower. The short smooth coat has dulled and thinned, showing the delicate frame underneath. A pale silver-cream frosting across the muzzle, the brows and around the eyes, fading into the fawn. Smaller gentler round eyes #2A2320 with a dim white highlight dot upper-right, outer corners tilting downward, a soft crease beneath each eye. Small black nose, mouth closed and restful. Thin legs tucked in, thin tail curled against the body. Serene, dignified, fragile.',
        palette:
          'Coat muted fawn #CBA079; muzzle frosting, brows, chest silver-cream #EFE2D2; ears faded #B08350; nose, eyes, mouth #2A2320; one uniform thick warm brown outline #6B5236.',
      },
    },
  },
  bichon: {
    anchors: [
      'NO visible ears - groomed into the coat, head silhouette unbroken',
      'Scalloped, cloud-like, cotton-ball outline (NOT "feathering" = Golden, NOT "tight curls" = Poodle)',
      'Short round cotton-puff tail at the hip',
      'Perfectly round head that reads round from any angle',
    ],
    stages: {
      baby: {
        subject: 'a Bichon Frise puppy',
        pose: 'Rolled over onto its back on the floor, all four legs folded up in the air, spine twisted, head upside-down and tipped back. The person crouches over it, one hand on its belly, face in frame and laughing down at it. Mouth open in an upside-down grin, eyes rolled back toward the camera in a happy upside-down glance. Ridiculous, undignified, unposed.',
        look: 'Extremely oversized perfectly round head (1.35x body width, reads perfectly round from any angle), NO visible ears, unbroken scalloped outline (10 shallow bumps on head, 12 on body, soft downy puppy fluff). Plump round belly, no waist. Huge wide-set round eyes in warm grey #8E8A83 with a white highlight dot upper-right, puffed cheeks, tiny pure-white oval muzzle low on the face, small grey oval nose, tiny mouth. Very short neck, rounded fluffy shoulders, small soft white chest ruff, very stubby legs with tiny oval paws, small cotton-puff tail. Innocent, curious, uncoordinated.',
        palette:
          'Coat #F7F3EC; ruff, muzzle, paws #FFFFFF; one uniform thick grey outline #8E8A83.',
      },
      teen: {
        subject: 'a Bichon Frise adolescent',
        pose: "Front end dropped low to the ground, chest and elbows down, rump and tail high in the air, mid-bounce and about to spring. Three-quarter view, body angled away from the camera. The person crouches opposite, hands out, mid-laugh, their face in frame and turned toward the dog. The dog's head is up and cocked to one side, locked on them. Springy, coiled, unposed.",
        look: 'Oversized perfectly round head (1.25x body width, reads perfectly round from any angle), NO visible ears, unbroken scalloped outline (12 bumps on head, 14 on body, slightly uneven and wispy as the coat fills in). Lanky body with a hint of a waist. Large bright wide-set round eyes in warm grey #8E8A83 with a white highlight dot upper-right, small pure-white oval muzzle, small grey oval nose, tiny mouth. Very short neck, rounded fluffy shoulders, white chest ruff filling in, long thin legs with small oval paws, round cotton-puff tail. Alert, energetic, mischievous.',
        palette:
          'Coat #F7F3EC; ruff, muzzle, paws #FFFFFF; one uniform thick grey outline #8E8A83.',
      },
      young: {
        subject: 'a Bichon Frise',
        pose: "Mid-stride walking alongside the person, near-profile view, one front paw lifted mid-step, body clearly moving through the frame. The person walks beside it in step, one hand hanging down near its head, their face in frame and tipped down toward the dog. The dog's head is turned up and sideways toward them. Loose, in motion, unposed.",
        look: 'Oversized perfectly round head (1.2x body width, reads perfectly round from any angle), NO visible ears, unbroken scalloped outline (14 soft bumps on head, 16 on body). Large wide-set round eyes in warm grey #8E8A83 with a white highlight dot upper-right, small pure-white oval muzzle, small grey oval nose, tiny downward-curved closed mouth. Very short neck, rounded fluffy shoulders, full white chest ruff, stubby front legs with small oval paws, round cotton-puff tail at the right hip. Calm, content, trusting.',
        palette:
          'Coat #F7F3EC; ruff, muzzle, paws #FFFFFF; one uniform thick grey outline #8E8A83.',
      },
      elder: {
        subject: 'an elderly Bichon Frise',
        pose: "Lying close beside the person with its chin dropped onto their forearm, the full weight of the head resting on them. Near-profile view. The person's other hand comes over to cradle the side of its face, their own face in frame and turned down toward it. The dog's eyes are half-closed, drifting up toward them. Heavy, affectionate, unposed.",
        look: 'Perfectly round head slightly larger than the body (1.15x body width), NO visible ears, unbroken scalloped outline (11 broad shallow bumps on head, 13 on body, some flattening almost smooth as the coat thins). Broader heavier body, lower softer shoulders. Smaller gentler wide-set round eyes in warm grey #8E8A83 with a dim white highlight dot upper-right, outer corners tilting downward, a soft crease beneath each eye. Small pure-white oval muzzle, faintly yellowed aged ivory tint around the muzzle and under the eyes, small grey oval nose, tiny closed mouth. Very short neck, white chest ruff hanging flat, short thick legs with small oval paws, small cotton-puff tail. Serene, dignified.',
        palette:
          'Coat #F7F3EC; ruff, muzzle, paws #FFFFFF; one uniform thick grey outline #8E8A83.',
      },
    },
  },
  doberman: {
    anchors: [
      'BLACK AND RUST: a near-black body with sharply bounded RUST points on the muzzle, the eyebrows, the throat, the chest and the feet - marked places, never random spots or a patchy coat',
      'Tall NARROW ERECT ears standing straight up and tapering to fine points, unusually long for the head',
      'A long narrow wedge muzzle on a lean dry head, with a level topline and a deep chest over a hard tucked waist',
      'A very short DOCKED tail carried high, and a short hard glossy coat with no feathering anywhere',
    ],
    stages: {
      baby: {
        subject: 'a Doberman Pinscher puppy',
        pose: "Standing on its hind legs with both front paws planted on the person's knee, stretching upward, body fully extended and slightly off-balance. The person bends toward it, both hands reaching in, their face in frame and laughing down at it. The dog's head is tilted up and back, gaze locked on their face. Eager, pushy, unposed.",
        look: 'Oversized round head (1.3x body width) with a short blunt muzzle, far rounder and softer than the adult wedge. The ears are still soft and FOLDED over, not yet erect, sitting high on the head. Short hard glossy coat lying flat everywhere. Plump round belly, no waist, short thick legs and oversized paws. Huge round dark eyes #17120F with a white highlight dot upper-right, a small dark nose, tiny closed mouth. The BLACK AND RUST pattern is already set - rust on the muzzle, the eyebrows, the throat, the chest and the feet, black everywhere else - and the short docked tail wags high. Innocent, bold, uncoordinated.',
        palette:
          'Coat near-black #2B2422; muzzle, brows, throat, chest, paws rust #8E5230; rust highlight #B87A4E; nose, eyes, mouth #17120F; one uniform thick warm charcoal outline #4A3A32.',
      },
      teen: {
        subject: 'a Doberman Pinscher adolescent',
        pose: "Front end dropped low to the ground, chest and elbows down, rump high in the air, mid-bounce and about to spring. Three-quarter view, body angled away from the camera. The person crouches opposite, hands out, mid-laugh, their face in frame and turned toward the dog. The dog's head is up and cocked to one side, locked on them. Springy, coiled, unposed.",
        look: 'Head (1.2x body width) with the muzzle stretching out into its adult wedge. The tall NARROW ERECT ears are now standing and tapering to fine points, still slightly too big for the head. The body has gone leggy and light, all height and no depth yet, the chest not yet dropped, an exaggerated tuck at the waist. Short hard glossy coat lying tight. Large bright almond eyes #17120F with a white highlight dot upper-right, dark nose, mouth open in a happy grin. Sharply bounded rust points against the black, and a short docked tail carried high. Alert, springy, over-eager.',
        palette:
          'Coat near-black #2B2422; muzzle, brows, throat, chest, paws rust #8E5230; rust highlight #B87A4E; nose, eyes, mouth #17120F; one uniform thick warm charcoal outline #4A3A32.',
      },
      young: {
        subject: 'a Doberman Pinscher',
        pose: "Mid-stride walking alongside the person, near-profile view, one front paw lifted mid-step, body clearly moving through the frame. The person walks beside it in step, one hand hanging down near its head, their face in frame and tipped down toward the dog. The dog's head is turned up and sideways toward them. Loose, in motion, unposed.",
        look: 'Lean dry head (1.2x body width) with a long narrow wedge muzzle and a dark nose. Tall NARROW ERECT ears standing straight up and tapering to fine points, unusually long for the head. The body is at its peak - square and muscular without bulk, a level topline, a deep chest dropping to the elbow over a hard tucked waist, built on long straight legs. Short hard glossy coat lying tight everywhere with no feathering. Almond eyes #17120F with a white highlight dot upper- right, set obliquely, calm and watchful. Mouth closed and firm. Crisp BLACK AND RUST - a near-black body with sharply bounded rust on the muzzle, the eyebrows, the throat, the chest and the feet - and a very short DOCKED tail carried high. Athletic, alert, elegant.',
        palette:
          'Coat near-black #2B2422; muzzle, brows, throat, chest, paws rust #8E5230; rust highlight #B87A4E; nose, eyes, mouth #17120F; one uniform thick warm charcoal outline #4A3A32.',
      },
      elder: {
        subject: 'an elderly Doberman Pinscher',
        pose: "Sitting close beside the person with its chin dropped onto their forearm, the full weight of the head resting on them. Near-profile view. The person's other hand comes over to cradle the side of its face, their own face in frame and tipped toward the dog. The dog's eyes are half-closed, drifting up toward them. Heavy, affectionate, unposed.",
        look: 'Head (1.15x body width), the wedge softer and broader through the cheeks. The tall ERECT ears still stand but sit a little lower and thinner at the points. The square body has thickened and settled, the topline dipping behind the shoulders, the deep chest lower, the waist less tucked. The short coat has dulled from black toward a soft charcoal and thinned against the frame. A clear silver-grey frosting across the muzzle, the brows and around the eyes, blurring the hard edge of the rust points. Smaller gentler almond eyes #17120F with a dim white highlight dot upper-right, outer corners tilting downward, a soft crease beneath each eye. Dark nose, mouth closed and restful. The short docked tail is carried lower. Serene, dignified, watchful to the end.',
        palette:
          'Coat faded charcoal #3B322E; muzzle frosting and brows silver-grey #C9BCB2; throat, chest, paws muted rust #7E4B30; nose, eyes, mouth #17120F; one uniform thick warm charcoal outline #4A3A32.',
      },
    },
  },
  yorkshire: {
    anchors: [
      'TWO-TONE coat: steel blue-grey over the back and sides, rich warm tan on the head, chest and legs - the split is the breed',
      'Long, perfectly straight silky hair parted down the middle of the back (NOT curly, NOT fluffy, NOT scalloped)',
      'Small ERECT V-shaped ears standing up out of the head hair',
      'A topknot of hair gathered on the crown, tiny black button nose',
    ],
    stages: {
      baby: {
        subject: 'a Yorkshire Terrier puppy',
        pose: "Curled up drowsing in the person's lap, body folded into a tight comma, head tucked against their forearm, one paw hanging loose over their knee. The person sits upright, NOT hunched over the dog, and only tips their chin down a little so their face stays open to the camera. The dog's eyes are heavy-lidded and half open, drifting up toward them. Sleepy, heavy, unposed.",
        look: 'Oversized round head (1.3x body width) on a tiny body. Coat still short and soft, the colours not yet separated - mostly dark steel with warm tan only beginning to show on the muzzle, brows, chest and paws. Ears small and soft, tipping over rather than standing. Short round muzzle, tiny black button nose. Huge round dark eyes #26221F with a white highlight dot upper-right, very wide-set. Plump belly, tiny stubby legs, short tail with a small tuft. Innocent, curious, uncoordinated.',
        palette:
          'Body steel blue-grey #6E7480; head, chest, legs tan #C08A52; muzzle and brows light tan #DDAE79; nose, eyes, mouth #26221F; one uniform thick dark grey outline #4A4640.',
      },
      teen: {
        subject: 'a Yorkshire Terrier adolescent',
        pose: "Front end dropped low to the ground, chest and elbows down, rump high in the air, mid-bounce and about to spring. Three-quarter view, body angled away from the camera. The person crouches opposite, hands out, mid-laugh, their face in frame and turned toward the dog. The dog's head is up and cocked to one side, locked on them. Springy, coiled, unposed.",
        look: 'Round head (1.2x body width) on a small leggy body. The two colours have now clearly separated - steel blue-grey across the back and sides against warm tan on the head, chest and legs. The silky hair is growing out unevenly, a shaggy fringe flopping over the eyes and longer strands starting to hang at the flanks, the spine parting only half set. Small ERECT V-shaped ears now standing up out of the head hair. Large bright round eyes #26221F with a white highlight dot upper-right, tiny black button nose, mouth slightly open in a cheeky grin. Fine long legs, tail carried up with a light fringe. Alert, bossy, mischievous.',
        palette:
          'Body steel blue-grey #6E7480; head, chest, legs tan #C08A52; muzzle and brows light tan #DDAE79; nose, eyes, mouth #26221F; one uniform thick dark grey outline #4A4640.',
      },
      young: {
        subject: 'a Yorkshire Terrier',
        pose: "Sitting close beside the person with its chin dropped onto their forearm, the full weight of the head resting on them. Near-profile view. The person's other hand comes over to cradle the side of its face, their own face in frame and turned down toward it. The dog's eyes are half-closed, drifting up toward them. Heavy, affectionate, unposed.",
        look: 'Small round head (1.2x body width). The coat is at its peak - long, glossy, perfectly straight silk falling flat from a clean centre part along the spine, steel blue-grey down the back and sides, rich warm tan flowing over the head, chest and legs, the colour boundary crisp. A neat topknot of hair gathered up on the crown, keeping the face open. Small ERECT V-shaped ears standing clear above it. Bright round dark eyes #26221F with a white highlight dot upper-right, tiny black button nose, small closed mouth. Fine legs half hidden under the hanging hair, tail carried up with a silky fringe. Tiny, elegant, self-assured.',
        palette:
          'Body steel blue-grey #6E7480; head, chest, legs tan #C08A52; muzzle and brows light tan #DDAE79; nose, eyes, mouth #26221F; one uniform thick dark grey outline #4A4640.',
      },
      elder: {
        subject: 'an elderly Yorkshire Terrier',
        pose: "Held up against the person's chest, scooped under the front legs, the body hanging soft and relaxed against them. The person's face, arms and upper body are all in frame, their cheek close to the dog's head. The dog's head rests back against their shoulder, its face right beside theirs, giving the camera a soft tired glance. Limp, content, unposed.",
        look: 'Round head (1.15x body width), ears still ERECT but tipping slightly and set a little lower. The silky coat has thinned and shortened, hanging closer to the body with wispier ends, the centre part less crisp, and the steel blue has faded toward a soft dove grey. A pale silver frosting across the muzzle, the brows and around the eyes, washing the tan out to cream. Smaller gentler round eyes #26221F with a dim white highlight dot upper-right, outer corners tilting downward, a soft crease beneath each eye. Tiny black nose, mouth closed and restful. Thin legs, tail fringe sparse and carried low. Serene, dignified, feather-light.',
        palette:
          'Body faded dove grey #838894; head, chest, legs muted tan #BE9871; muzzle frosting and brows silver-cream #EDE4D6; nose, eyes, mouth #26221F; one uniform thick dark grey outline #4A4640.',
      },
    },
  },
  pointer: {
    anchors: [
      'LIVER AND WHITE: a white base coat broken by a few large solid LIVER patches - one over an eye and ear, one or two across the back - with fine liver TICKING speckled over the white in between',
      'Long soft DROP ears set level with the eyes, hanging flat against the cheeks with slightly pointed tips',
      'A long deep muzzle with a pronounced stop and open nostrils, on a head carried high',
      'A lean athletic build, longer than tall, with a level topline and a straight tapering tail carried straight out LEVEL with the back',
    ],
    stages: {
      baby: {
        subject: 'an English Pointer puppy',
        pose: 'Rolled over onto its back, all four legs folded up in the air, spine twisted, head upside-down and tipped back. The person crouches over it, one hand on its belly, face in frame and laughing down at it. Mouth open in an upside-down grin, eyes rolled back toward the camera in a happy upside-down glance. Ridiculous, undignified, unposed.',
        look: 'Oversized round head (1.3x body width) with a short blunt muzzle, not yet deep or squared. The DROP ears are already oversized, set level with the eyes and hanging flat and soft against the cheeks. Short smooth puppy coat lying flat. Plump round belly, no waist, short thick legs and oversized paws. Huge round dark eyes #33261E with a white highlight dot upper-right, a large dark nose, tiny open mouth. The LIVER AND WHITE pattern is already set - a solid liver patch over one eye and ear, another across the back, fine liver ticking speckling the white in between - and a short straight tail. Innocent, silly, uncoordinated.',
        palette:
          'Base coat white #F5EEE4; liver patches #6E4630; ticking #A98366; nose, eyes, mouth #33261E; one uniform thick warm brown outline #6B5343.',
      },
      teen: {
        subject: 'an English Pointer adolescent',
        pose: "Standing on its hind legs with both front paws planted on the person's knee, stretching upward, body fully extended and slightly off-balance. The person bends toward it, both hands reaching in, their face in frame and laughing down at it. The dog's head is tilted up and back, gaze locked on their face. Eager, pushy, unposed.",
        look: 'Head (1.2x body width) with the muzzle lengthening and the stop beginning to show. The long DROP ears now hang past the jaw, set level with the eyes, swinging loose. The body has gone all legs, the chest not yet dropped, an exaggerated tuck at the waist. Short smooth glossy coat lying tight. Large bright round eyes #33261E with a white highlight dot upper-right, big dark nose already working the air, mouth open in a happy grin. Large solid liver patches over the white with fine ticking between them, and a straight tapering tail carried out level. Alert, wired, distractible.',
        palette:
          'Base coat white #F5EEE4; liver patches #6E4630; ticking #A98366; nose, eyes, mouth #33261E; one uniform thick warm brown outline #6B5343.',
      },
      young: {
        subject: 'an English Pointer',
        pose: "Mid-stride walking alongside the person, near-profile view, one front paw lifted mid-step, body clearly moving through the frame. The person walks beside it in step, one hand hanging down near its head, their face in frame and tipped down toward the dog. The dog's head is turned up and sideways toward them. Loose, in motion, unposed.",
        look: 'Clean-lined head (1.2x body width) carried high, with a long deep muzzle, a pronounced stop and a large dark nose with open nostrils. Long soft DROP ears set level with the eyes, hanging flat against the cheeks with slightly pointed tips. The body is at its peak - lean and athletic, clearly longer than tall, a level topline over a deep chest and a firm tucked waist, built on long straight legs. Short smooth hard coat lying tight everywhere with no feathering. Round dark eyes #33261E with a white highlight dot upper-right, soft and intent. Mouth slightly open. Crisp LIVER AND WHITE - a few large solid liver patches over a white base with fine liver ticking speckled between them - and a straight tapering tail carried straight out LEVEL with the back. Athletic, focused, nose always working.',
        palette:
          'Base coat white #EDE3D6; liver patches #6E4630; ticking #A98366; nose, eyes, mouth #33261E; one uniform thick warm brown outline #6B5343.',
      },
      elder: {
        subject: 'an elderly English Pointer',
        pose: "Lying belly-down and completely melted into the ground, hind legs kicked straight out behind in a loose frog-leg splay, front legs stretched forward. The chin rests directly on the ground between the front paws. The person sits right beside the dog, one hand resting on its back, their face turned down toward it and fully in frame. The dog's head is laid slightly off-center, eyes looking softly up toward them. Boneless, unposed.",
        look: 'Head (1.15x body width), broader and softer through the muzzle. The long DROP ears hang low and thin, spreading out where they touch the ground. The lean body has thickened and settled heavy and low, the topline soft, the shoulders dropped. The short coat has dulled and thinned, and the liver patches have faded toward a soft muted brown while the ticking has spread and gone grey. A clear silver-white frosting across the muzzle, the brows and around the eyes, running into the white of the face so the whole front reads pale. Smaller gentler round eyes #33261E with a dim white highlight dot upper-right, outer corners tilting downward, a soft crease beneath each eye. Large dark nose, mouth closed and restful. The straight tail rests flat on the ground. Serene, dignified.',
        palette:
          'Base coat silver-white #F1EADD; liver patches faded #7E5A46; ticking greyed #B4A08F; nose, eyes, mouth #33261E; one uniform thick warm brown outline #6B5343.',
      },
    },
  },
  greyhound: {
    anchors: [
      "Small ROSE EARS folded back flat against the neck, only lifting halfway when alert - never standing erect and never hanging like a spaniel's",
      'A very long narrow muzzle on a flat narrow skull, with large dark eyes set obliquely',
      'An extreme sighthound outline: a very deep chest dropping past the elbow, a dramatic ARCHED loin and a severely TUCKED waist, on long fine legs',
      'A very long thin tail carried LOW in a slight upward curve at the tip, and a short fine coat close enough to show the ribs and the muscle beneath',
    ],
    stages: {
      baby: {
        subject: 'a Greyhound puppy',
        pose: "Held up against the person's chest, scooped under the front legs, the body hanging soft and relaxed against them. The person's face, arms and upper body are all in frame, their cheek close to the dog's head. The dog's head rests back against their shoulder, its face right beside theirs, giving the camera a soft sleepy glance. Limp, content, unposed.",
        look: "Oversized round head (1.3x body width) with a short blunt muzzle, far rounder than the adult's narrow wedge. Small ROSE EARS already folded back against the neck, soft and loose. Short fine puppy coat lying flat. Plump round belly with only the faintest hint of a waist, short legs that already look a size too long, and oversized paws. Huge round dark eyes #2C2622 with a white highlight dot upper-right, a small dark nose, tiny closed mouth. Plain fawn throughout with a pale muzzle, chest and toes, and a long thin tail hanging low. Innocent, gangly, uncoordinated.",
        palette:
          'Coat pale fawn #D6C3A8; muzzle, chest, toes cream #E4D8C4; shading #9C8666; nose, eyes, mouth #2C2622; one uniform thick warm brown outline #6E5C48.',
      },
      teen: {
        subject: 'a Greyhound adolescent',
        pose: "Mid-stride walking alongside the person, near-profile view, one front paw lifted mid-step, body clearly moving through the frame. The person walks beside it in step, one hand hanging down near its head, their face in frame and tipped down toward the dog. The dog's head is turned up and sideways toward them. Loose, in motion, unposed.",
        look: 'Head (1.2x body width) with the muzzle stretching out long and narrow and the skull flattening. Small ROSE EARS folded back against the neck, lifting halfway when something catches their attention. The body has gone all legs and angles, the deep chest not yet dropped but the waist already severely tucked and the loin beginning to arch. Short fine coat lying tight, thin enough to show the ribs. Large dark eyes #2C2622 with a white highlight dot upper-right, set obliquely, mouth open in a happy grin. Plain fawn with a pale muzzle, chest and toes, and a very long thin tail carried low. Light, springy, easily startled.',
        palette:
          'Coat fawn #C3AE93; muzzle, chest, toes cream #E4D8C4; shading #9C8666; nose, eyes, mouth #2C2622; one uniform thick warm brown outline #6E5C48.',
      },
      young: {
        subject: 'a Greyhound',
        pose: 'Rolled over onto its back, all four legs folded up in the air, spine twisted, head upside-down and tipped back. The person crouches over it, one hand on its belly, face in frame and laughing down at it. Mouth open in an upside-down grin, eyes rolled back toward the camera in a happy upside-down glance. Ridiculous, undignified, unposed.',
        look: 'Flat narrow skull (1.2x body width) with a very long narrow muzzle and a small dark nose. Small ROSE EARS folded back flat against the neck. The body is at its peak and shows the full sighthound outline - a very deep chest dropping past the elbow, a dramatic ARCHED loin and a severely TUCKED waist, carried on long fine legs with hard clean muscle. Short fine coat lying close enough to show the ribs and the long muscle beneath. Large dark eyes #2C2622 with a white highlight dot upper-right, set obliquely, gentle and far-seeing. Mouth slightly open. Plain fawn with a pale muzzle, chest and toes, and a very long thin tail carried LOW with a slight upward curve at the tip. Fast, fragile, surprisingly gentle.',
        palette:
          'Coat fawn #C3AE93; muzzle, chest, toes cream #E4D8C4; shading #9C8666; nose, eyes, mouth #2C2622; one uniform thick warm brown outline #6E5C48.',
      },
      elder: {
        subject: 'an elderly Greyhound',
        pose: "Curled up drowsing in the person's lap, body folded into a tight comma, head tucked against their forearm, one paw hanging loose over their knee. The person sits upright, NOT hunched over the dog, and only tips their chin down a little so their face stays open to the camera. The dog's eyes are heavy-lidded and half open, drifting up toward them. Sleepy, heavy, unposed.",
        look: 'Head (1.15x body width), the long muzzle a little softer and broader. The small ROSE EARS sit lower and thinner against the neck. The deep- chested body has settled, the arched loin flatter, the shoulders dropped, the frame showing more plainly through the thinned coat. A clear silver-white frosting across the muzzle, the brows and around the eyes, fading into the fawn. Smaller gentler dark eyes #2C2622 with a dim white highlight dot upper-right, outer corners tilting downward, a soft crease beneath each eye. Small dark nose, mouth closed and restful. The very long thin tail curls in against the body. Serene, dignified, delicate.',
        palette:
          'Coat muted fawn #B5A188; muzzle frosting, brows, chest silver-white #EFE7DA; shading #8E7A5E; nose, eyes, mouth #2C2622; one uniform thick warm brown outline #6E5C48.',
      },
    },
  },
  cavalier: {
    anchors: [
      'Solid RUBY colour - a warm rich chestnut over the whole body with no white markings at all (white would make it a Blenheim, a different variety)',
      'Very large, round, dark, wide-set eyes on a gently rounded head with a SHALLOW stop and a short tapered muzzle',
      'Long DROP ears set high, hung with abundant silky FEATHERING that spills well past the jaw and frames the whole face',
      'A small square toy build with silky feathering on the legs, the feet and the tail, and a plumed tail carried level in constant motion',
    ],
    stages: {
      baby: {
        subject: 'a Cavalier King Charles Spaniel puppy',
        pose: "Curled up drowsing in the person's lap, body folded into a tight comma, head tucked against their forearm, one paw hanging loose over their knee. The person sits upright, NOT hunched over the dog, and only tips their chin down a little so their face stays open to the camera. The dog's eyes are heavy-lidded and half open, drifting up toward them. Sleepy, heavy, unposed.",
        look: 'Oversized round head (1.3x body width) with a very short tapered muzzle and a soft baby-round skull. The DROP ears are already oversized, set high and hanging against the cheeks, covered in short soft fluff with no feathering yet. Short silky puppy coat lying flat. Plump round belly, no waist, short stubby legs and oversized paws. Enormous round wide-set dark eyes #241A14 with a white highlight dot upper-right, dominating the face, a small dark nose, tiny closed mouth. Solid RUBY chestnut everywhere with no white, and a short tail with a small tuft beginning at the tip. Innocent, drowsy, uncoordinated.',
        palette:
          'Coat pale ruby #C68A5A; chest and muzzle #DCA772; ears deeper chestnut #96562C; nose, eyes, mouth #241A14; one uniform thick warm brown outline #6A422A.',
      },
      teen: {
        subject: 'a Cavalier King Charles Spaniel adolescent',
        pose: 'Rolled over onto its back, all four legs folded up in the air, spine twisted, head upside-down and tipped back. The person crouches over it, one hand on its belly, face in frame and laughing down at it. Mouth open in an upside-down grin, eyes rolled back toward the camera in a happy upside-down glance. Ridiculous, undignified, unposed.',
        look: 'Head (1.2x body width) with the muzzle settling into its short tapered adult shape over a shallow stop. The long DROP ears now hang past the jaw and the silky FEATHERING has started coming in, uneven and wispy at the edges. The body has gone leggy and light, the chest not yet dropped, a visible tuck at the waist. Silky coat lying flat with feathering beginning on the legs and the tail. Large bright round wide-set eyes #241A14 with a white highlight dot upper-right, dark nose, mouth open in a happy grin. Solid RUBY chestnut with no white, and a plumed tail wagging level. Sweet, silly, endlessly friendly.',
        palette:
          'Coat ruby #B5713F; feathering and chest #DCA772; ears deeper chestnut #96562C; nose, eyes, mouth #241A14; one uniform thick warm brown outline #6A422A.',
      },
      young: {
        subject: 'a Cavalier King Charles Spaniel',
        pose: "Standing on its hind legs with both front paws planted on the person's knee, stretching upward, body fully extended and slightly off-balance. The person bends toward it, both hands reaching in, their face in frame and laughing down at it. The dog's head is tilted up and back, gaze locked on their face. Eager, pushy, unposed.",
        look: 'Gently rounded head (1.2x body width) with a SHALLOW stop, a short tapered muzzle and a small dark nose. Long DROP ears set high, hung with abundant silky FEATHERING that spills well past the jaw and frames the whole face. The body is at its peak - a small square toy build, as tall as it is long, built on straight legs with silky feathering down the backs. Silky straight coat with feathering on the ears, the legs, the feet and the tail, never curly. Very large round wide-set dark eyes #241A14 with a white highlight dot upper-right, soft and melting. Mouth slightly open in a cheerful expression. Solid RUBY chestnut over the whole body with no white markings, and a plumed tail carried level in constant motion. Gentle, affectionate, always leaning in.',
        palette:
          'Coat ruby #B5713F; feathering and chest #DCA772; ears deeper chestnut #96562C; nose, eyes, mouth #241A14; one uniform thick warm brown outline #6A422A.',
      },
      elder: {
        subject: 'an elderly Cavalier King Charles Spaniel',
        pose: "Sitting close beside the person with its chin dropped onto their forearm, the full weight of the head resting on them. Near-profile view. The person's other hand comes over to cradle the side of its face, their own face in frame and tipped toward the dog. The dog's eyes are half-closed, drifting up toward them. Heavy, affectionate, unposed.",
        look: 'Head (1.15x body width), rounder and softer through the cheeks. The long DROP ears hang lower, their feathering thinner and wispier at the ends. The small square body has thickened and settled low, the topline soft, the shoulders dropped. The silky coat has dulled and thinned, the leg feathering sparse. A clear silver-cream frosting across the muzzle, the brows and around the eyes, fading into the ruby. Smaller gentler round eyes #241A14 with a dim white highlight dot upper-right, outer corners tilting downward, a soft crease beneath each eye. Small dark nose, mouth closed and restful. The tail plume is thinner and carried lower. Serene, dignified, still leaning in.',
        palette:
          'Coat muted ruby #A46940; muzzle frosting, brows, chest silver-cream #EEE0CE; ears faded #8A5029; nose, eyes, mouth #241A14; one uniform thick warm brown outline #6A422A.',
      },
    },
  },
  jindo: {
    anchors: [
      'Medium-large, SQUARE, athletic build - clearly bigger and longer-legged than a Shiba Inu, with a deep chest and a level back',
      'ERECT triangular ears set wide on a broad forehead, pointing slightly forward',
      'A thick tail carried in a firm SICKLE curve up over the back (a raised arc, not a flat coiled ring)',
      'Clean short double coat with NO long feathering; almond eyes set slightly slanted, calm and watchful',
    ],
    stages: {
      baby: {
        subject: 'a Korean Jindo puppy',
        pose: "Front end dropped low to the ground, chest and elbows down, rump high in the air, mid-bounce and about to spring. Three-quarter view, body angled away from the camera. The person crouches opposite, hands out, mid-laugh, their face in frame and turned toward the dog. The dog's head is up and cocked to one side, locked on them. Springy, coiled, unposed.",
        look: 'Oversized round head (1.3x body width) with a short blunt muzzle, far rounder and softer than the adult wedge. ERECT triangular ears still soft and only half standing, tipping at the points. Thick plush puppy double coat standing out evenly, no feathering. Plump round belly, no waist, sturdy short legs and oversized paws. Huge round dark eyes #2A2521 with a white highlight dot upper-right, small dark oval nose, tiny closed mouth. Short thick tail beginning to lift into a curve. Innocent, bold, uncoordinated.',
        palette:
          'Coat white #F4EFE5; shading and undercoat #DFD4C2; ears #E7DECD; nose, eyes, mouth #2A2521; one uniform thick warm grey outline #6E6152.',
      },
      teen: {
        subject: 'a Korean Jindo adolescent',
        pose: "Mid-stride walking alongside the person, near-profile view, one front paw lifted mid-step, body clearly moving through the frame. The person walks beside it in step, one hand hanging down near its head, their face in frame and tipped down toward the dog. The dog's head is turned up and sideways toward them. Loose, in motion, unposed.",
        look: 'Head (1.2x body width) with the muzzle lengthening into the adult wedge. ERECT triangular ears now firmly upright and set wide, looking a touch large for the head. The body has shot up leggy and rangy - long legs, a shallow chest, a visible tuck at the waist, all frame and no muscle yet. The coat is mid-change, slightly uneven as the adult double coat pushes through. Bright almond eyes #2A2521 with a white highlight dot upper-right, dark oval nose, mouth slightly open in an easy grin. Tail carried up in a loose curve, the sickle not yet firm. Alert, watchful, restless.',
        palette:
          'Coat white #F4EFE5; shading and undercoat #DFD4C2; ears #E7DECD; nose, eyes, mouth #2A2521; one uniform thick warm grey outline #6E6152.',
      },
      young: {
        subject: 'a Korean Jindo',
        pose: "Sitting shoulder to shoulder with the person, both turned to look out at the same view off to one side. Seen from a three-quarter FRONT angle, so both faces stay visible in profile - the dog's head in clean profile with its ears and coat catching the light, the person's face lit from the side. The person's arm rests along the dog's back. Quiet, companionable, unposed.",
        look: 'Broad wedge head (1.2x body width) with a wide flat forehead and a strong, cleanly tapering muzzle. ERECT triangular ears set wide, pointing slightly forward. The body is at its peak - medium-large, square and athletic, deep through the chest, with a level back, a firm tuck and clean straight legs. Short dense double coat lying close with a slight ruff at the neck and NO long feathering anywhere. Almond eyes #2A2521 set slightly slanted, with a white highlight dot upper-right, calm and watchful. Dark oval nose, mouth slightly open in a composed expression. A thick tail carried up over the back in a firm SICKLE curve. Noble, alert, self-contained.',
        palette:
          'Coat white #F4EFE5; shading and undercoat #DFD4C2; ears #E7DECD; nose, eyes, mouth #2A2521; one uniform thick warm grey outline #6E6152.',
      },
      elder: {
        subject: 'an elderly Korean Jindo',
        pose: "Sitting pressed against the person's leg, the whole body leaning into them for balance, head tipped all the way back to look up at their face. Three-quarter view, body angled away from the camera. The person looks down at it, their face in frame, one hand resting on the dog's chest. The two eyelines meet. Trusting, settled, unposed.",
        look: 'Broad wedge head (1.15x body width), heavier and softer through the cheeks. ERECT ears still standing but set lower and thinner at the points. The square body has thickened and settled, the topline dipping a little behind the shoulders, the shoulders themselves lower. The double coat has dulled and thinned, lying flatter against the frame. A soft silver-grey frosting across the muzzle, the brows and around the eyes, reading as shadow against the white coat. Smaller gentler almond eyes #2A2521 with a dim white highlight dot upper-right, outer corners tilting downward, a soft crease beneath each eye. Dark oval nose, mouth closed and restful. Tail still curved over the back but looser and carried lower. Serene, dignified, watchful to the end.',
        palette:
          'Coat white #F4EFE5 slightly dulled; muzzle frosting and brows silver-grey #CFC6B8; undercoat shading #DFD4C2; nose, eyes, mouth #2A2521; one uniform thick warm grey outline #6E6152.',
      },
    },
  },
  pomeranian: {
    anchors: [
      'Small ERECT triangular ears set high and close together (Bichon has none, Poodle and Golden have drop ears)',
      'A huge standing RUFF / mane of coat around the neck and chest, far fuller than the rest of the body',
      'A plumed tail fanned up and forward over the back',
      'Tiny fox-like face - short pointed muzzle, bright almond eyes',
    ],
    stages: {
      baby: {
        subject: 'a Pomeranian puppy',
        pose: "Curled up drowsing in the person's lap, body folded into a tight comma, head tucked against their forearm, one paw hanging loose over their knee. The person sits upright, NOT hunched over the dog, and only tips their chin down a little so their face stays open to the camera. The dog's eyes are heavy-lidded and half open, drifting up toward them. Sleepy, heavy, unposed.",
        look: 'Oversized round head (1.3x body width) on a tiny round body - the whole dog reads as a soft ball of fluff. Small ERECT triangular ears, still rounded at the tips and slightly too small for the head, poking up out of the coat. Dense short baby fluff standing out evenly all over, the neck ruff not yet grown. Very short pointed muzzle, tiny black nose. Huge round dark eyes #2E2723 with a white highlight dot upper-right, tiny closed mouth. Stubby legs almost swallowed by the coat, short tail with a small feather curling up over the back. Innocent, curious, uncoordinated.',
        palette:
          'Coat orange sable #E3A05A; ruff and chest cream #F3D9B2; ear tips deeper #C98548; nose, eyes, mouth #2E2723; one uniform thick warm brown outline #7A5636.',
      },
      teen: {
        subject: 'a Pomeranian adolescent',
        pose: "Standing on its hind legs with both front paws planted on the person's knee, stretching upward, body fully extended and slightly off-balance. The person bends toward it, both hands reaching in, their face in frame and laughing down at it. The dog's head is tilted up and back, gaze locked on their face. Eager, pushy, unposed.",
        look: 'Round head (1.2x body width), the ears now grown into sharp ERECT triangles standing tall and looking slightly too big. The coat is in its awkward stage - patchy and uneven, short and close on the body while longer tufts stick out at the shoulders and hips, the neck ruff only starting to stand. Legs suddenly long and visible under the thinner coat. Fox-like face with a short pointed muzzle, tiny black nose. Large bright almond eyes #2E2723 with a white highlight dot upper-right, mouth slightly open in a small grin. Tail carried up over the back with a half-grown plume. Alert, energetic, mischievous.',
        palette:
          'Coat orange sable #E3A05A; ruff and chest cream #F3D9B2; ear tips deeper #C98548; nose, eyes, mouth #2E2723; one uniform thick warm brown outline #7A5636.',
      },
      young: {
        subject: 'a Pomeranian',
        pose: "Sitting pressed against the person's leg, the whole body leaning into them for balance, head tipped all the way back to look up at their face. Three-quarter view, body angled away from the camera. The person looks down at it, their face in frame, one hand resting on the dog's chest. The two eyelines meet. Trusting, settled, unposed.",
        look: 'Round head (1.2x body width) with small ERECT triangular ears set high and close together, nearly lost in the coat around them. The coat is at its peak - a dense double coat standing straight out from the body, and around the neck and chest a huge lion-like RUFF that swallows the shoulders and frames the face like a collar. Short pointed fox muzzle, small black nose. Bright almond eyes #2E2723 with a white highlight dot upper-right, mouth slightly open in a small confident grin. Fine short legs, a full plumed tail fanned up and forward over the back. Compact, cocky, poised.',
        palette:
          'Coat orange sable #E3A05A; ruff and chest cream #F3D9B2; ear tips deeper #C98548; nose, eyes, mouth #2E2723; one uniform thick warm brown outline #7A5636.',
      },
      elder: {
        subject: 'an elderly Pomeranian',
        pose: "Sitting close beside the person with its chin dropped onto their forearm, the full weight of the head resting on them. Near-profile view. The person's other hand comes over to cradle the side of its face, their own face in frame and turned down toward it. The dog's eyes are half-closed, drifting up toward them. Heavy, affectionate, unposed.",
        look: 'Round head (1.15x body width), ears still ERECT but set a little lower and softer at the tips. The coat has thinned - it lies closer to the body instead of standing out, and the great neck ruff has flattened into a soft collar rather than a mane. A pale silver-cream frosting across the muzzle, the brows and the cheeks, fading into the orange. Smaller gentler almond eyes #2E2723 with a dim white highlight dot upper-right, outer corners tilting downward, a soft crease beneath each eye. Small black nose, mouth closed and restful. Thin legs, tail plume thinner and carried lower against the back. Serene, dignified.',
        palette:
          'Coat muted orange #D69B62; ruff, brows and muzzle silver-cream #F0E3D0; ears faded #BE8A5B; nose, eyes, mouth #2E2723; one uniform thick warm brown outline #7A5636.',
      },
    },
  },
};
