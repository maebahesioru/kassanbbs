import { err, ok } from "neverthrow";
import { Result } from "neverthrow";

import { DatabaseError } from "../../shared/types/Error";
import { createReadBoardName } from "../domain/read/ReadBoardName";
import { createReadDefaultAuthorName } from "../domain/read/ReadDefaultAuthorName";
import { createReadLocalRule } from "../domain/read/ReadLocalRule";
import { createReadMaxContentLength } from "../domain/read/ReadMaxContentLength";
import {
  createReadNormalConfig,
  type ReadNormalConfig,
} from "../domain/read/ReadNormalConfig";

import type { VakContext } from "../../shared/types/VakContext";

export const getNormalConfigRepository = async ({
  sql,
  logger,
}: VakContext): Promise<Result<ReadNormalConfig, DatabaseError>> => {
  logger.debug({
    operation: "getNormalConfig",
    message: "Fetching board configuration from database",
  });

  try {
        const result = await sql<
      {
        board_name: string;
        local_rule: string;
        nanashi_name: string;
        max_content_length: number;
        max_lines: number;
        max_line_width: number;
        max_anchors: number;
        captcha_provider: string;
        captcha_site_key: string;
        captcha_secret_key: string;
        enable_dnsbl: boolean;
        dnsbl_hostnames: string;
        enable_vpn_detection: boolean;
        referrer_cushion: string;
        head_html: string;
        foot_html: string;
        meta_html: string;
        subtitle: string;
        favicon_url: string;
        board_image_url: string;
        board_image_link_url: string;
        bg_color: string;
        text_color: string;
        link_color: string;
        name_color: string;
        enable_twitter_widgets: boolean;
        limitme_enabled: boolean;
        limitme_from: number;
        limitme_to: number;
        search_captcha_enabled: boolean;
        read_type: string;
        auto_discover_threads: boolean;
        bg_color2: string;
        title_color: string;
        cap_color: string;
        post_bg_color: string;
        anchor_color: string;
        index_bg_color: string;
        create_bg_color: string;
        menu_bg_color: string;
        menu_text_color: string;
        title_id: boolean;
        msec_display: boolean;
        hide_hits: boolean;
        pr_text: string;
        pr_link: string;
        max_name_length: number;
        max_mail_length: number;
        max_subject_length: number;
        line_max_chars: number;
        submax: number;
        datmax: number;
        nanashi_check: boolean;
        samba_time: number;
        houshi_time: number;
        tatesugi_hour: number;
        tatesugi_count: number;
        tatesugi_close: number;
        tatesugi_close_count: number;
        slip_enabled: boolean;
        slip_default_level: string;
        disp_ip: boolean;
        be_enabled: boolean;
        vote_enabled: boolean;
        omikuji_enabled: boolean;
        tasukeruyo_enabled: boolean;
        hide_op: boolean;
        img_tag: boolean;
        twitter_embed: boolean;
        movie_embed: boolean;
        url_to_title: boolean;
        auto_fall: boolean;
        captcha_per_board: string;
        usecaptcha_on_admin: boolean;
        high_light: boolean;
        weekday_chars: string;
        trip_column: number;
      }[]
    >`
            SELECT
                board_name,
                local_rule,
                nanashi_name,
                max_content_length,
                COALESCE(max_lines, 30) as max_lines,
                COALESCE(max_line_width, 80) as max_line_width,
                COALESCE(max_anchors, 10) as max_anchors,
                captcha_provider,
                captcha_site_key,
                captcha_secret_key,
                enable_dnsbl,
                dnsbl_hostnames,
                enable_vpn_detection,
                referrer_cushion,
                head_html,
                foot_html,
                meta_html,
                COALESCE(subtitle, '') as subtitle,
                COALESCE(favicon_url, '') as favicon_url,
                COALESCE(board_image_url, '') as board_image_url,
                COALESCE(board_image_link_url, '') as board_image_link_url,
                COALESCE(bg_color, '#f3f4f6') as bg_color,
                COALESCE(text_color, '#1f2937') as text_color,
                COALESCE(link_color, '#7c3aed') as link_color,
                COALESCE(name_color, '#374151') as name_color,
                COALESCE(enable_twitter_widgets, false) as enable_twitter_widgets,
                COALESCE(limitme_enabled, false) as limitme_enabled,
                COALESCE(limitme_from, 0) as limitme_from,
                COALESCE(limitme_to, 0) as limitme_to,
                COALESCE(search_captcha_enabled, false) as search_captcha_enabled,
                COALESCE(read_type, '5ch') as read_type,
                COALESCE(auto_discover_threads, true) as auto_discover_threads,
                COALESCE(bg_color2, '#ffffff') as bg_color2,
                COALESCE(title_color, '#000000') as title_color,
                COALESCE(cap_color, '#ff0000') as cap_color,
                COALESCE(post_bg_color, '#ffffff') as post_bg_color,
                COALESCE(anchor_color, '#0000ff') as anchor_color,
                COALESCE(index_bg_color, '#ffffff') as index_bg_color,
                COALESCE(create_bg_color, '#ffffff') as create_bg_color,
                COALESCE(menu_bg_color, '#ffffff') as menu_bg_color,
                COALESCE(menu_text_color, '#000000') as menu_text_color,
                COALESCE(title_id, true) as title_id,
                COALESCE(msec_display, false) as msec_display,
                COALESCE(hide_hits, false) as hide_hits,
                COALESCE(pr_text, '') as pr_text,
                COALESCE(pr_link, '') as pr_link,
                COALESCE(max_name_length, 20) as max_name_length,
                COALESCE(max_mail_length, 50) as max_mail_length,
                COALESCE(max_subject_length, 100) as max_subject_length,
                COALESCE(line_max_chars, 80) as line_max_chars,
                COALESCE(submax, 1000) as submax,
                COALESCE(datmax, 1000) as datmax,
                COALESCE(nanashi_check, true) as nanashi_check,
                COALESCE(samba_time, 30) as samba_time,
                COALESCE(houshi_time, 60) as houshi_time,
                COALESCE(tatesugi_hour, 24) as tatesugi_hour,
                COALESCE(tatesugi_count, 5) as tatesugi_count,
                COALESCE(tatesugi_close, 48) as tatesugi_close,
                COALESCE(tatesugi_close_count, 3) as tatesugi_close_count,
                COALESCE(slip_enabled, false) as slip_enabled,
                COALESCE(slip_default_level, 'vvv') as slip_default_level,
                COALESCE(disp_ip, false) as disp_ip,
                COALESCE(be_enabled, false) as be_enabled,
                COALESCE(vote_enabled, false) as vote_enabled,
                COALESCE(omikuji_enabled, false) as omikuji_enabled,
                COALESCE(tasukeruyo_enabled, false) as tasukeruyo_enabled,
                COALESCE(hide_op, false) as hide_op,
                COALESCE(img_tag, false) as img_tag,
                COALESCE(twitter_embed, false) as twitter_embed,
                COALESCE(movie_embed, false) as movie_embed,
                COALESCE(url_to_title, false) as url_to_title,
                COALESCE(auto_fall, false) as auto_fall,
                COALESCE(captcha_per_board, 'none') as captcha_per_board,
                COALESCE(usecaptcha_on_admin, false) as usecaptcha_on_admin,
                COALESCE(high_light, true) as high_light,
                COALESCE(weekday_chars, '日月火水木金土') as weekday_chars,
                COALESCE(trip_column, 0) as trip_column
            FROM
                config
        `;

    if (!result || result.length !== 1) {
      logger.error({
        operation: "getNormalConfig",
        message: "Failed to retrieve configuration, invalid database response",
      });
      return err(new DatabaseError("設定の取得に失敗しました"));
    }

    logger.debug({
      operation: "getNormalConfig",
      boardName: result[0].board_name,
      maxContentLength: result[0].max_content_length,
      message: "Configuration data retrieved from database",
    });

    const combinedResult = Result.combine([
      createReadBoardName(result[0].board_name),
      createReadLocalRule(result[0].local_rule),
      createReadDefaultAuthorName(result[0].nanashi_name),
      createReadMaxContentLength(result[0].max_content_length),
    ]);

    if (combinedResult.isErr()) {
      logger.error({
        operation: "getNormalConfig",
        error: combinedResult.error,
        message: "Failed to create domain objects from database result",
      });
      return err(combinedResult.error);
    }

    const [boardName, localRule, defaultAuthorName, maxContentLength] =
      combinedResult.value;

    const normalConfigResult = createReadNormalConfig({
      boardName,
      localRule,
      defaultAuthorName,
      maxContentLength,
      maxLines: Number(result[0].max_lines) || 30,
      maxLineWidth: Number(result[0].max_line_width) || 80,
      maxAnchors: Number(result[0].max_anchors) || 10,
      captchaProvider: result[0].captcha_provider,
      captchaSiteKey: result[0].captcha_site_key,
      captchaSecretKey: result[0].captcha_secret_key,
      enableDnsbl: result[0].enable_dnsbl,
      dnsblHostnames: result[0].dnsbl_hostnames,
      enableVpnDetection: result[0].enable_vpn_detection,
      referrerCushion: result[0].referrer_cushion,
      headHtml: result[0].head_html,
      footHtml: result[0].foot_html,
      metaHtml: result[0].meta_html,
      subtitle: result[0].subtitle,
      faviconUrl: result[0].favicon_url,
      boardImageUrl: result[0].board_image_url,
      boardImageLinkUrl: result[0].board_image_link_url,
      bgColor: result[0].bg_color,
      textColor: result[0].text_color,
      linkColor: result[0].link_color,
      nameColor: result[0].name_color,
      enableTwitterWidgets: result[0].enable_twitter_widgets,
      limitmeEnabled: result[0].limitme_enabled,
      limitmeFrom: Number(result[0].limitme_from) || 0,
      limitmeTo: Number(result[0].limitme_to) || 0,
      searchCaptchaEnabled: result[0].search_captcha_enabled,
      readType: result[0].read_type || "5ch",
      autoDiscoverThreads: result[0].auto_discover_threads,
      bgColor2: result[0].bg_color2,
      titleColor: result[0].title_color,
      capColor: result[0].cap_color,
      postBgColor: result[0].post_bg_color,
      anchorColor: result[0].anchor_color,
      indexBgColor: result[0].index_bg_color,
      createBgColor: result[0].create_bg_color,
      menuBgColor: result[0].menu_bg_color,
      menuTextColor: result[0].menu_text_color,
      titleId: result[0].title_id,
      msecDisplay: result[0].msec_display,
      hideHits: result[0].hide_hits,
      prText: result[0].pr_text,
      prLink: result[0].pr_link,
      maxNameLength: Number(result[0].max_name_length) || 20,
      maxMailLength: Number(result[0].max_mail_length) || 50,
      maxSubjectLength: Number(result[0].max_subject_length) || 100,
      lineMaxChars: Number(result[0].line_max_chars) || 80,
      submax: Number(result[0].submax) || 1000,
      datmax: Number(result[0].datmax) || 1000,
      nanashiCheck: result[0].nanashi_check,
      sambaTime: Number(result[0].samba_time) || 30,
      houshiTime: Number(result[0].houshi_time) || 60,
      tatesugiHour: Number(result[0].tatesugi_hour) || 24,
      tatesugiCount: Number(result[0].tatesugi_count) || 5,
      tatesugiClose: Number(result[0].tatesugi_close) || 48,
      tatesugiCloseCount: Number(result[0].tatesugi_close_count) || 3,
      slipEnabled: result[0].slip_enabled,
      slipDefaultLevel: result[0].slip_default_level || "vvv",
      dispIp: result[0].disp_ip,
      beEnabled: result[0].be_enabled,
      voteEnabled: result[0].vote_enabled,
      omikujiEnabled: result[0].omikuji_enabled,
      tasukeruyoEnabled: result[0].tasukeruyo_enabled,
      hideOp: result[0].hide_op,
      imgTag: result[0].img_tag,
      twitterEmbed: result[0].twitter_embed,
      movieEmbed: result[0].movie_embed,
      urlToTitle: result[0].url_to_title,
      autoFall: result[0].auto_fall,
      captchaPerBoard: result[0].captcha_per_board || "none",
      usecaptchaOnAdmin: result[0].usecaptcha_on_admin,
      highLight: result[0].high_light,
      weekdayChars: result[0].weekday_chars || "日月火水木金土",
      tripColumn: Number(result[0].trip_column) || 0,
    });

    if (normalConfigResult.isErr()) {
      logger.error({
        operation: "getNormalConfig",
        error: normalConfigResult.error,
        message: "Failed to create ReadNormalConfig object",
      });
      return err(normalConfigResult.error);
    }

    logger.info({
      operation: "getNormalConfig",
      boardName: boardName.val,
      message: "Configuration retrieved successfully",
    });

    return ok(normalConfigResult.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
      operation: "getNormalConfig",
      error,
      message: `Database error while retrieving configuration: ${message}`,
    });
    return err(
      new DatabaseError(`設定の取得中にエラーが発生しました: ${message}`, error)
    );
  }
};
