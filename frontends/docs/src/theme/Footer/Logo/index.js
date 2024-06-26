/*
 * Copyright (c) MLCommons and its affiliates.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react'
import clsx from 'clsx'
import Link from '@docusaurus/Link'
import { useBaseUrlUtils } from '@docusaurus/useBaseUrl'
import ThemedImage from '@theme/ThemedImage'
import styles from './styles.module.css'
function LogoImage({ logo }) {
  const { withBaseUrl } = useBaseUrlUtils()
  const sources = {
    light: withBaseUrl(logo.src),
  }
  return (
    <ThemedImage
      className={clsx('footer__logo', logo.className)}
      alt={logo.alt}
      sources={sources}
      width={logo.width}
      height={logo.height}
      style={logo.style}
    />
  )
}
export default function FooterLogo({ logo }) {
  return logo.href ? (
    <Link
      href={logo.href}
      className={styles.footerLogoLink}
      target={logo.target}
    >
      <LogoImage logo={logo} />
    </Link>
  ) : (
    <LogoImage logo={logo} />
  )
}
