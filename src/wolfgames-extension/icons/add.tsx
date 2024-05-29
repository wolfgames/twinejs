import { iconColor } from '../constants';

const add = `<svg version="1.1" id="Uploaded to svgrepo.com" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
	 width="32px" height="32px" viewBox="0 0 32 32" xml:space="preserve">
<style type="text/css">
	.bentblocks_een{fill:${iconColor};}
</style>
<path class="bentblocks_een" d="M24,15v2h-7v7h-2v-7H8v-2h7V8h2v7H24z M24.485,24.485c-4.686,4.686-12.284,4.686-16.971,0
	c-4.686-4.686-4.686-12.284,0-16.971c4.687-4.686,12.284-4.686,16.971,0C29.172,12.201,29.172,19.799,24.485,24.485z M23.071,8.929
	c-3.842-3.842-10.167-3.975-14.142,0c-3.899,3.899-3.899,10.243,0,14.142c3.975,3.975,10.301,3.841,14.142,0
	C26.97,19.172,26.97,12.828,23.071,8.929z"/>
</svg>`;

export const addIcon = <img src={'data:image/svg+xml;base64,' + window.btoa(add)} alt="" />;
