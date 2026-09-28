/* ARKT — pages légales (mentions légales, politique de confidentialité) */
import React, { useEffect } from 'react';

const MAIL = "arthur@arkt-conseil.com";

function H2({ n, children }) {
  return <h2><span>{n}.</span>{children}</h2>;
}

function MentionsLegales() {
  return (
    <>
      <p className="eyebrow"><span className="dot" />Informations légales</p>
      <h1 className="display">Mentions légales</h1>

      <H2 n={1}>Éditeur du site</H2>
      <p>Le présent site, accessible à l’adresse <strong>www.arkt-conseil.com</strong>, est édité par :</p>
      <div className="legal-card">
        <p>
          <strong>ARKT</strong><br />
          Entreprise unipersonnelle à responsabilité limitée (EURL) au capital de <strong>157 320 €</strong><br />
          Siège social : <strong>14 Square Belsunce, 13001 Marseille, France</strong><br />
          SIREN : <strong>948 538 756</strong><br />
          SIRET : <strong>948 538 756 00024</strong><br />
          RCS Marseille : <strong>948 538 756 R.C.S. Marseille</strong><br />
          N° de TVA intracommunautaire : <strong>FR30948538756</strong>
        </p>
      </div>
      <p>Contact : <strong><a href={"mailto:" + MAIL}>{MAIL}</a></strong></p>

      <H2 n={2}>Directeur de la publication</H2>
      <p>Le directeur de la publication est <strong>Arthur Barret</strong>, en qualité de gérant d’ARKT.</p>

      <H2 n={3}>Hébergement</H2>
      <p>Le site est hébergé par :</p>
      <div className="legal-card">
        <p>
          <strong>OVH SAS</strong><br />
          2 rue Kellermann<br />
          59100 Roubaix<br />
          France
        </p>
      </div>

      <H2 n={4}>Propriété intellectuelle</H2>
      <p>L’ensemble des éléments présents sur le site www.arkt-conseil.com, notamment les textes, photographies, illustrations, éléments graphiques, logos, vidéos, créations, mises en page et éléments visuels, sont protégés par les dispositions applicables en matière de propriété intellectuelle.</p>
      <p>Sauf mention contraire, ces éléments sont la propriété d’ARKT ou sont utilisés avec l’autorisation de leurs titulaires.</p>
      <p>Toute reproduction, représentation, modification, adaptation, diffusion ou exploitation, totale ou partielle, de ces contenus, par quelque procédé que ce soit et sur quelque support que ce soit, sans autorisation écrite préalable d’ARKT, est interdite sauf dans les cas prévus par la loi.</p>

      <H2 n={5}>Responsabilité</H2>
      <p>ARKT s’efforce de fournir sur ce site des informations aussi exactes et actualisées que possible.</p>
      <p>Toutefois, ARKT ne peut garantir l’exactitude, l’exhaustivité ou l’actualité permanente des informations publiées sur le site.</p>
      <p>ARKT ne pourra être tenue responsable des dommages directs ou indirects pouvant résulter de l’accès au site, de son utilisation ou de l’impossibilité d’y accéder.</p>
      <p>Le site peut contenir des liens vers des sites internet ou services tiers. ARKT n’exerce aucun contrôle sur ces ressources externes et ne saurait être tenue responsable de leur contenu, de leur disponibilité ou de leurs pratiques.</p>

      <H2 n={6}>Données personnelles</H2>
      <p>Les informations relatives à la collecte et au traitement des données personnelles des utilisateurs sont détaillées dans la <strong><a href="/politique-de-confidentialite/">Politique de confidentialité</a></strong> du site.</p>

      <H2 n={7}>Cookies</H2>
      <p>Le site peut utiliser des cookies ou autres traceurs nécessaires à son fonctionnement, à la mesure de son audience ou, sous réserve du consentement de l’utilisateur lorsque celui-ci est requis, à d’autres finalités.</p>
      <p>L’utilisateur peut gérer ses préférences relatives aux cookies à tout moment depuis l’outil de gestion des cookies disponible sur le site.</p>

      <H2 n={8}>Droit applicable</H2>
      <p>Le présent site et les présentes mentions légales sont soumis au droit français.</p>
      <p>En cas de litige et à défaut de résolution amiable, les juridictions compétentes seront déterminées conformément aux règles de droit commun applicables.</p>
    </>
  );
}

function PolitiqueConfidentialite() {
  return (
    <>
      <p className="eyebrow"><span className="dot" />Informations légales</p>
      <h1 className="display">Politique de confidentialité</h1>
      <p className="legal-updated">Dernière mise à jour : septembre 2026</p>

      <p>ARKT accorde une importance particulière à la protection de vos données personnelles et s’engage à les traiter conformément au Règlement général sur la protection des données (RGPD) et à la législation française applicable.</p>
      <p>La présente politique a pour objectif de vous expliquer quelles données peuvent être collectées lorsque vous utilisez le site <strong>www.arkt-conseil.com</strong>, pourquoi elles sont utilisées et quels sont vos droits.</p>

      <H2 n={1}>Responsable du traitement</H2>
      <p>Le responsable du traitement des données collectées sur le site est :</p>
      <div className="legal-card">
        <p>
          <strong>ARKT</strong><br />
          EURL au capital de 157 320 €<br />
          14 Square Belsunce<br />
          13001 Marseille, France<br />
          SIREN : 948 538 756
        </p>
      </div>
      <p>Pour toute question relative à vos données personnelles, vous pouvez nous contacter à l’adresse suivante :</p>
      <p><strong><a href={"mailto:" + MAIL}>{MAIL}</a></strong></p>

      <H2 n={2}>Données susceptibles d’être collectées</H2>
      <p>Lorsque vous utilisez le site, ARKT peut notamment collecter les catégories de données suivantes :</p>
      <h3>Données transmises directement par l’utilisateur</h3>
      <p>Lorsque vous utilisez un formulaire de contact ou prenez directement contact avec ARKT, vous pouvez être amené à communiquer certaines informations telles que :</p>
      <ul>
        <li>votre nom et votre prénom ;</li>
        <li>votre adresse électronique ;</li>
        <li>votre numéro de téléphone, lorsqu’il est demandé ;</li>
        <li>le nom de votre entreprise ;</li>
        <li>les informations relatives à votre projet ou à votre demande ;</li>
        <li>toute autre information que vous choisissez volontairement de nous transmettre.</li>
      </ul>
      <h3>Données techniques et de navigation</h3>
      <p>Lors de votre navigation sur le site, certaines informations techniques peuvent également être traitées, notamment :</p>
      <ul>
        <li>l’adresse IP ;</li>
        <li>le type de navigateur ou d’appareil utilisé ;</li>
        <li>les pages consultées ;</li>
        <li>les dates et heures de connexion ;</li>
        <li>certaines données relatives à la navigation et à la mesure d’audience.</li>
      </ul>
      <p>La nature exacte des informations collectées dépend notamment des cookies et outils de mesure d’audience utilisés sur le site.</p>

      <H2 n={3}>Finalités du traitement</H2>
      <p>Les données personnelles collectées peuvent être utilisées afin de :</p>
      <ul>
        <li>répondre aux demandes envoyées via le site ;</li>
        <li>échanger avec les prospects, clients et partenaires d’ARKT ;</li>
        <li>étudier une demande de prestation ou de collaboration ;</li>
        <li>préparer et assurer le suivi d’une relation commerciale ;</li>
        <li>améliorer le fonctionnement, les contenus et l’expérience utilisateur du site ;</li>
        <li>mesurer la fréquentation et les performances du site ;</li>
        <li>assurer la sécurité et le bon fonctionnement technique du site ;</li>
        <li>respecter les obligations légales et réglementaires applicables à ARKT.</li>
      </ul>
      <p>Les données collectées ne sont pas utilisées pour des finalités incompatibles avec celles pour lesquelles elles ont initialement été obtenues.</p>

      <H2 n={4}>Bases légales des traitements</H2>
      <p>Selon la situation, les traitements réalisés par ARKT peuvent reposer sur :</p>
      <p><strong>L’intérêt légitime d’ARKT</strong>, notamment pour répondre à une demande de contact, assurer le suivi d’une relation professionnelle, sécuriser le site ou améliorer ses services.</p>
      <p><strong>L’exécution de mesures précontractuelles ou d’un contrat</strong>, lorsque les échanges concernent une demande de prestation ou une relation contractuelle avec ARKT.</p>
      <p><strong>Le consentement</strong>, lorsque celui-ci est requis, notamment pour certains cookies ou traceurs.</p>
      <p><strong>Une obligation légale</strong>, lorsque la conservation ou le traitement de certaines données est imposé par la réglementation.</p>

      <H2 n={5}>Destinataires des données</H2>
      <p>Les données personnelles collectées sont accessibles uniquement aux personnes ayant besoin d’en connaître dans le cadre de leurs fonctions au sein d’ARKT.</p>
      <p>Elles peuvent également être traitées par certains prestataires techniques intervenant pour le compte d’ARKT, notamment pour :</p>
      <ul>
        <li>l’hébergement du site ;</li>
        <li>la maintenance et le fonctionnement du site ;</li>
        <li>la gestion des formulaires ;</li>
        <li>la mesure d’audience ;</li>
        <li>les outils de communication et de gestion commerciale.</li>
      </ul>
      <p>Ces prestataires ne peuvent utiliser les données qui leur sont confiées que dans le cadre des missions qui leur sont attribuées et conformément aux exigences applicables en matière de protection des données.</p>
      <p>ARKT ne vend pas les données personnelles de ses utilisateurs.</p>

      <H2 n={6}>Durée de conservation</H2>
      <p>Les données personnelles sont conservées uniquement pendant la durée nécessaire aux finalités pour lesquelles elles ont été collectées.</p>
      <p>À titre indicatif :</p>
      <ul>
        <li>les données relatives à un prospect peuvent être conservées pendant <strong>trois ans à compter de leur collecte ou du dernier contact émanant du prospect</strong> ;</li>
        <li>les données relatives à une relation client peuvent être conservées pendant la durée de la relation commerciale puis archivées pendant les durées nécessaires au respect des obligations légales ou à la défense des droits d’ARKT ;</li>
        <li>les données collectées via certains outils de mesure d’audience et cookies sont conservées pendant une durée limitée dépendant de leur finalité et de l’outil utilisé.</li>
      </ul>
      <p>À l’issue de ces périodes, les données sont supprimées ou anonymisées, sauf lorsqu’une obligation légale impose leur conservation pendant une durée plus longue.</p>

      <H2 n={7}>Cookies et traceurs</H2>
      <p>Le site peut utiliser des cookies et autres traceurs afin d’assurer son bon fonctionnement et, le cas échéant, de mesurer son audience.</p>
      <p>Certains cookies strictement nécessaires au fonctionnement du site peuvent être déposés sans consentement préalable.</p>
      <p>Les cookies qui ne sont pas strictement nécessaires, notamment certains cookies de mesure d’audience, publicitaires ou liés à des services tiers, ne sont déposés qu’après avoir obtenu votre consentement lorsque celui-ci est requis.</p>
      <p>Vous pouvez accepter ou refuser ces cookies et modifier votre choix à tout moment depuis le module de gestion des cookies accessible sur le site.</p>
      <p>Le refus des cookies non nécessaires n’empêche pas l’accès aux principales fonctionnalités du site.</p>

      <H2 n={8}>Transferts de données hors de l’Union européenne</H2>
      <p>Certains prestataires techniques utilisés par ARKT peuvent être établis ou traiter certaines données en dehors de l’Union européenne ou de l’Espace économique européen.</p>
      <p>Lorsque de tels transferts ont lieu, ARKT veille à ce qu’ils reposent sur un mécanisme reconnu par la réglementation applicable, notamment une décision d’adéquation ou des garanties appropriées telles que les clauses contractuelles types de la Commission européenne.</p>

      <H2 n={9}>Sécurité des données</H2>
      <p>ARKT met en œuvre des mesures techniques et organisationnelles raisonnables afin de protéger les données personnelles contre leur destruction, perte, altération, divulgation ou accès non autorisé.</p>
    </>
  );
}

const LEGAL_PAGES = {
  "/mentions-legales/": { title: "Mentions légales — ARKT", Body: MentionsLegales },
  "/politique-de-confidentialite/": { title: "Politique de confidentialité — ARKT", Body: PolitiqueConfidentialite },
};

function legalPageFor(pathname) {
  const p = pathname.endsWith("/") ? pathname : pathname + "/";
  return LEGAL_PAGES[p] ? p : null;
}

function LegalPage({ path }) {
  const { Body, title } = LEGAL_PAGES[path];
  useEffect(() => { document.title = title; }, [title]);
  return (
    <section className="legal">
      <div className="wrap legal-in">
        <Body />
      </div>
    </section>
  );
}

export { LegalPage, legalPageFor, LEGAL_PAGES };
